const mongoose = require('mongoose');
const Product = require('../products/product.model');
const Category = require('../categories/category.model');
const Order = require('../orders/order.model');
const User = require('../auth/auth.model');
const ApiError = require('../../core/errors/ApiError');

/**
 * @class AdminService
 * @description Lógica de negocio para panel administrativo
 * 
 * Responsabilidades:
 * - Agregaciones y métricas del dashboard
 * - Gestión de usuarios (CRUD)
 * - Reportes y analytics
 * - Auditoría y logs
 */
class AdminService {
  
  // ==========================================
  // DASHBOARD - Estadísticas y métricas
  // ==========================================
  
  /**
   * Obtener estadísticas del dashboard
   * @returns {Promise<Object>} Estadísticas completas
   */
  async getDashboardStats() {
    try {
      // Agregación de ventas totales (solo órdenes pagadas)
      const salesAggregation = await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { 
          $group: { 
            _id: null, 
            totalRevenue: { $sum: '$totalAmount' },
            totalOrders: { $sum: 1 }
          } 
        }
      ]);

      // Contadores en paralelo (optimización)
      const [
        totalProducts,
        totalUsers,
        totalCategories,
        pendingOrders,
        lowStockProducts
      ] = await Promise.all([
        Product.countDocuments({ status: 'active' }),
        User.countDocuments({ isActive: true }),
        Category.countDocuments({ status: 'active' }),
        Order.countDocuments({ status: 'pending' }),
        Product.countDocuments({ stock: { $lt: 10 }, trackQuantity: true })
      ]);

      // Órdenes recientes (últimas 10)
      const recentOrders = await Order.find()
        .sort({ createdAt: -1 })
        .limit(10)
        .populate('user', 'profile.firstName profile.lastName email')
        .select('orderNumber status totalAmount paymentStatus createdAt')
        .lean();

      // Productos más vendidos (top 10)
      const topProducts = await Order.aggregate([
        { $match: { paymentStatus: 'paid' } },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
            productName: { $first: '$items.productName' },
            productImage: { $first: '$items.productImage' }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 }
      ]);

      // Nuevos usuarios (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const newUsers = await User.countDocuments({
        createdAt: { $gte: thirtyDaysAgo }
      });

      return {
        revenue: {
          total: salesAggregation[0]?.totalRevenue || 0,
          orderCount: salesAggregation[0]?.totalOrders || 0
        },
        counts: {
          products: totalProducts,
          users: totalUsers,
          categories: totalCategories,
          pendingOrders,
          lowStockProducts,
          newUsers
        },
        recentOrders,
        topProducts
      };
      
    } catch (error) {
      console.error('Error en getDashboardStats:', error);
      throw ApiError.internal('Error al obtener estadísticas del dashboard');
    }
  }

  /**
   * Obtener datos de ventas para gráficos
   * @param {string} range - Rango temporal (daily, weekly, monthly, yearly)
   * @returns {Promise<Array>} Datos de ventas agrupados
   */
  async getSalesData(range = 'monthly') {
    try {
      let groupFormat;
      let dateRange = new Date();

      switch (range) {
        case 'daily':
          groupFormat = { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } };
          dateRange.setDate(dateRange.getDate() - 30); // Últimos 30 días
          break;
        case 'weekly':
          groupFormat = { $dateToString: { format: '%Y-%U', date: '$createdAt' } };
          dateRange.setDate(dateRange.getDate() - 90); // Últimos 3 meses
          break;
        case 'yearly':
          groupFormat = { $dateToString: { format: '%Y', date: '$createdAt' } };
          dateRange.setFullYear(dateRange.getFullYear() - 3); // Últimos 3 años
          break;
        default: // monthly
          groupFormat = { $dateToString: { format: '%Y-%m', date: '$createdAt' } };
          dateRange.setMonth(dateRange.getMonth() - 12); // Últimos 12 meses
      }

      const salesData = await Order.aggregate([
        { 
          $match: { 
            paymentStatus: 'paid',
            createdAt: { $gte: dateRange }
          } 
        },
        {
          $group: {
            _id: groupFormat,
            totalSales: { $sum: '$totalAmount' },
            orderCount: { $sum: 1 },
            averageOrderValue: { $avg: '$totalAmount' }
          }
        },
        { $sort: { _id: 1 } }
      ]);

      return salesData;
      
    } catch (error) {
      console.error('Error en getSalesData:', error);
      throw ApiError.internal('Error al obtener datos de ventas');
    }
  }

  // ==========================================
  // USUARIOS - Gestión completa
  // ==========================================

  /**
   * Obtener usuarios con filtros y paginación
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Object>} Usuarios y paginación
   */
  async getUsers(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        role, 
        search,
        isActive,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Construir query
      const query = {};
      
      if (role) query.role = role;
      if (isActive !== undefined) query.isActive = isActive === 'true';
      
      if (search) {
        query.$or = [
          { 'profile.firstName': { $regex: search, $options: 'i' } },
          { 'profile.lastName': { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [users, total] = await Promise.all([
        User.find(query)
          .select('-password -__v')
          .sort(sort)
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        User.countDocuments(query),
      ]);

      return {
        users,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
      };
      
    } catch (error) {
      console.error('Error en getUsers:', error);
      throw ApiError.internal('Error al obtener usuarios');
    }
  }

  /**
   * Obtener detalles de usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Usuario completo
   */
  async getUserDetails(userId) {
    try {
      const user = await User.findById(userId)
        .select('-password')
        .lean();

      if (!user) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      // Obtener estadísticas del usuario
      const [orderCount, totalSpent, reviewCount] = await Promise.all([
        Order.countDocuments({ user: userId }),
        Order.aggregate([
          { $match: { user: mongoose.Types.ObjectId(userId), paymentStatus: 'paid' } },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } }
        ]),
        // Solo si existe el modelo Review
        mongoose.models.Review 
          ? mongoose.model('Review').countDocuments({ user: userId })
          : Promise.resolve(0)
      ]);

      return {
        ...user,
        stats: {
          orders: orderCount,
          totalSpent: totalSpent[0]?.total || 0,
          reviews: reviewCount
        }
      };
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en getUserDetails:', error);
      throw ApiError.internal('Error al obtener detalles del usuario');
    }
  }

  /**
   * Actualizar usuario (Admin)
   * @param {string} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Usuario actualizado
   */
  async updateUser(userId, updateData) {
    try {
      const { role, isActive, profile, updatedBy } = updateData;

      // Validaciones de negocio
      if (role && !['customer', 'admin', 'moderator'].includes(role)) {
        throw ApiError.badRequest('Rol inválido');
      }

      const updateFields = {};
      if (role) updateFields.role = role;
      if (isActive !== undefined) updateFields.isActive = isActive;
      if (profile) updateFields.profile = { ...profile };
      if (updatedBy) updateFields.updatedBy = updatedBy;

      const user = await User.findByIdAndUpdate(
        userId,
        { $set: updateFields },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      return user;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en updateUser:', error);
      throw ApiError.internal('Error al actualizar usuario');
    }
  }

  /**
   * Banear/Desbanear usuario
   * @param {string} userId - ID del usuario
   * @param {boolean} isBanned - Banear o desbanear
   * @param {string} reason - Razón del baneo
   * @returns {Promise<Object>} Usuario actualizado
   */
  async toggleUserBan(userId, isBanned, reason = '') {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        {
          $set: {
            isActive: !isBanned,
            ...(isBanned && { banReason: reason, bannedAt: new Date() })
          }
        },
        { new: true, runValidators: true }
      ).select('-password');

      if (!user) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      return user;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en toggleUserBan:', error);
      throw ApiError.internal('Error al banear/desbanear usuario');
    }
  }

  /**
   * Eliminar usuario (hard delete - solo admin)
   * @param {string} userId - ID del usuario
   * @returns {Promise<void>}
   */
  async deleteUser(userId) {
    try {
      // Verificar que no tenga órdenes pendientes
      const hasPendingOrders = await Order.exists({
        user: userId,
        status: { $in: ['pending', 'confirmed', 'processing'] }
      });

      if (hasPendingOrders) {
        throw ApiError.conflict(
          'No se puede eliminar el usuario porque tiene órdenes pendientes'
        );
      }

      const user = await User.findByIdAndDelete(userId);

      if (!user) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      // ✅ IMPLEMENTADO: Limpieza de datos relacionados
      try {
        // Limpiar reviews si existe el modelo
        if (mongoose.models.Review) {
          await mongoose.model('Review').deleteMany({ user: userId });
        }

        // Limpiar carrito si existe el modelo
        if (mongoose.models.Cart) {
          await mongoose.model('Cart').deleteOne({ user: userId });
        }

        // Limpiar wishlist si existe el modelo
        if (mongoose.models.Wishlist) {
          await mongoose.model('Wishlist').deleteOne({ user: userId });
        }

        // Limpiar actividad de usuario si existe el modelo
        if (mongoose.models.UserActivity) {
          await mongoose.model('UserActivity').deleteMany({ user: userId });
        }

        console.log(`✅ Limpieza completa de datos para usuario ${userId}`);
      } catch (cleanupError) {
        // No lanzar error si la limpieza falla, solo logear
        console.error('Error en limpieza de datos relacionados:', cleanupError);
      }
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en deleteUser:', error);
      throw ApiError.internal('Error al eliminar usuario');
    }
  }
}

module.exports = new AdminService();