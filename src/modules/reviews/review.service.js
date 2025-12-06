// src/modules/reviews/review.service.js

const Review = require('./review.model');
const Product = require('../products/product.model');
const Order = require('../orders/order.model');
const ApiError = require('../../core/errors/ApiError');

/**
 * @class ReviewService
 * @description Lógica de negocio para reviews
 * 
 * Responsabilidades:
 * - CRUD de reviews
 * - Verificación de compra (isVerified)
 * - Cálculo de estadísticas
 * - Moderación de contenido
 * - Sistema de engagement (helpful, reports)
 * 
 * Patrones aplicados:
 * - Service Layer Pattern
 * - Business Logic Encapsulation
 * - Domain-Driven Design
 */
class ReviewService {
  
  // ==========================================
  // OPERACIONES PÚBLICAS
  // ==========================================
  
  /**
   * Obtener reviews de un producto con filtros y paginación
   * 
   * @param {string} productId - ID del producto
   * @param {Object} options - Opciones de filtrado y paginación
   * @returns {Promise<Object>} Reviews y paginación
   */
  async getProductReviews(productId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        rating,
        verified,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Verificar que el producto existe
      const product = await Product.findById(productId);
      if (!product) {
        throw ApiError.notFound('Producto no encontrado');
      }

      // Construir query
      const query = {
        product: productId,
        isApproved: true
      };

      // Filtrar por rating si se proporciona
      if (rating) {
        query.rating = parseInt(rating);
      }

      // Filtrar por verificados
      if (verified === 'true') {
        query.isVerified = true;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      // Obtener reviews con paginación
      const [reviews, total] = await Promise.all([
        Review.find(query)
          .populate('user', 'profile.firstName profile.lastName profile.avatar')
          .sort(sort)
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        Review.countDocuments(query)
      ]);

      return {
        reviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      };
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en getProductReviews:', error);
      throw ApiError.internal('Error al obtener reviews');
    }
  }

  /**
   * Obtener estadísticas de reviews de un producto
   * 
   * @param {string} productId - ID del producto
   * @returns {Promise<Object>} Estadísticas completas
   */
  async getReviewStats(productId) {
    try {
      const stats = await Review.getProductStats(productId);

      // Formatear para frontend
      const overall = stats.overall?.[0] || { average: 0, total: 0 };
      
      const distribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0
      };

      if (stats.distribution) {
        stats.distribution.forEach(item => {
          distribution[item._id] = item.count;
        });
      }

      const verified = stats.verified || [];
      const verifiedCount = verified.find(v => v._id === true)?.count || 0;
      const totalCount = overall.total || 0;

      return {
        average: Math.round(overall.average * 10) / 10 || 0,
        total: totalCount,
        distribution,
        verifiedPercentage: totalCount > 0 
          ? Math.round((verifiedCount / totalCount) * 100) 
          : 0
      };
      
    } catch (error) {
      console.error('Error en getReviewStats:', error);
      throw ApiError.internal('Error al obtener estadísticas');
    }
  }

  // ==========================================
  // OPERACIONES DE USUARIO
  // ==========================================

  /**
   * Crear review
   * 
   * Validaciones:
   * - Producto existe
   * - Usuario no tiene review previa
   * - Verificar si compró el producto
   * 
   * @param {string} productId - ID del producto
   * @param {string} userId - ID del usuario
   * @param {Object} reviewData - Datos de la review
   * @returns {Promise<Object>} Review creada
   */
  async createReview(productId, userId, reviewData) {
    try {
      const { rating, title, comment, images } = reviewData;

      // Verificar que el producto existe
      const product = await Product.findById(productId);
      if (!product) {
        throw ApiError.notFound('Producto no encontrado');
      }

      // Verificar si el usuario ya hizo una review
      const existingReview = await Review.findOne({
        product: productId,
        user: userId
      });

      if (existingReview) {
        throw ApiError.conflict('Ya has hecho una review para este producto');
      }

      // Verificar si el usuario compró el producto (isVerified)
      const hasPurchased = await this._hasUserPurchasedProduct(userId, productId);

      // Crear review
      const review = await Review.create({
        product: productId,
        user: userId,
        rating,
        title,
        comment,
        images: images || [],
        isVerified: hasPurchased
      });

      // Poblar usuario
      await review.populate('user', 'profile.firstName profile.lastName profile.avatar');

      return review;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en createReview:', error);
      throw ApiError.internal('Error al crear review');
    }
  }

  /**
   * Actualizar review (solo el propietario)
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} userId - ID del usuario (owner)
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Review actualizada
   */
  async updateReview(reviewId, userId, updateData) {
    try {
      const review = await Review.findOne({
        _id: reviewId,
        user: userId
      });

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }

      // Actualizar campos permitidos
      if (updateData.rating !== undefined) review.rating = updateData.rating;
      if (updateData.title !== undefined) review.title = updateData.title;
      if (updateData.comment !== undefined) review.comment = updateData.comment;
      if (updateData.images !== undefined) review.images = updateData.images;

      await review.save();
      await review.populate('user', 'profile.firstName profile.lastName profile.avatar');

      return review;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en updateReview:', error);
      throw ApiError.internal('Error al actualizar review');
    }
  }

  /**
   * Eliminar review (solo el propietario)
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} userId - ID del usuario (owner)
   * @returns {Promise<void>}
   */
  async deleteReview(reviewId, userId) {
    try {
      const review = await Review.findOneAndDelete({
        _id: reviewId,
        user: userId
      });

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en deleteReview:', error);
      throw ApiError.internal('Error al eliminar review');
    }
  }

  /**
   * Marcar review como útil
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} userId - ID del usuario que marca
   * @returns {Promise<void>}
   */
  async markAsHelpful(reviewId, userId) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }

      // TODO: Implementar sistema para evitar múltiples votos del mismo usuario
      // Podría ser con un array de userIds que votaron o tabla intermedia

      await review.markAsHelpful();
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en markAsHelpful:', error);
      throw ApiError.internal('Error al marcar como útil');
    }
  }

  /**
   * Reportar review
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} userId - ID del usuario que reporta
   * @param {string} reason - Razón del reporte
   * @returns {Promise<void>}
   */
  async reportReview(reviewId, userId, reason) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }

      await review.report();

      // TODO: Notificar a administradores si tiene muchos reportes
      if (review.reportCount >= 5) {
        console.log(`Review ${reviewId} auto-moderada por reportes`);
        // Enviar notificación a admins
      }
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en reportReview:', error);
      throw ApiError.internal('Error al reportar review');
    }
  }

  // ==========================================
  // OPERACIONES ADMINISTRATIVAS
  // ==========================================

  /**
   * Obtener reviews pendientes de moderación (Admin)
   * 
   * @param {Object} options - Opciones de paginación
   * @returns {Promise<Object>} Reviews y paginación
   */
  async getPendingReviews(options = {}) {
    try {
      const { page = 1, limit = 20 } = options;

      const query = {
        $or: [
          { isApproved: false },
          { reportCount: { $gte: 3 } }
        ]
      };

      const skip = (page - 1) * limit;

      const [reviews, total] = await Promise.all([
        Review.find(query)
          .populate('user', 'profile.firstName profile.lastName email')
          .populate('product', 'name images')
          .sort({ reportCount: -1, createdAt: -1 })
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        Review.countDocuments(query)
      ]);

      return {
        reviews,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total
        }
      };
      
    } catch (error) {
      console.error('Error en getPendingReviews:', error);
      throw ApiError.internal('Error al obtener reviews pendientes');
    }
  }

  /**
   * Aprobar review (Admin)
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} moderatorId - ID del moderador
   * @returns {Promise<void>}
   */
  async approveReview(reviewId, moderatorId) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }

      await review.approve(moderatorId);
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en approveReview:', error);
      throw ApiError.internal('Error al aprobar review');
    }
  }

  /**
   * Rechazar review (Admin)
   * 
   * @param {string} reviewId - ID de la review
   * @param {string} moderatorId - ID del moderador
   * @returns {Promise<void>}
   */
  async rejectReview(reviewId, moderatorId) {
    try {
      const review = await Review.findById(reviewId);

      if (!review) {
        throw ApiError.notFound('Review no encontrada');
      }

      await review.reject(moderatorId);
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en rejectReview:', error);
      throw ApiError.internal('Error al rechazar review');
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  /**
   * Verificar si el usuario compró el producto
   * @private
   * @param {string} userId - ID del usuario
   * @param {string} productId - ID del producto
   * @returns {Promise<boolean>}
   */
  async _hasUserPurchasedProduct(userId, productId) {
    try {
      const order = await Order.findOne({
        user: userId,
        'items.product': productId,
        status: 'delivered',
        paymentStatus: 'paid'
      });

      return !!order;
    } catch (error) {
      console.error('Error verificando compra:', error);
      return false;
    }
  }
}

module.exports = new ReviewService();