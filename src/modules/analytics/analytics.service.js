const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const User = require('../auth/auth.model');
const Review = require('../reviews/review.model');
const ApiError = require('../../core/errors/ApiError');
const mongoose = require('mongoose');

/**
 * @class AnalyticsService
 * @description Lógica de negocio para análisis y estadísticas del sistema
 * 
 * Responsabilidades:
 * - Métricas de ventas (revenue, órdenes, productos)
 * - Estadísticas de usuarios (nuevos, activos, churn)
 * - Análisis de productos (más vendidos, más vistos)
 * - KPIs del negocio (AOV, conversión, etc.)
 */
class AnalyticsService {
  /**
   * Obtener dashboard general con KPIs principales
   * 
   * @param {Object} options - Opciones de fecha
   * @returns {Promise<Object>} Dashboard con métricas
   */
  async getDashboard(options = {}) {
    const { startDate, endDate } = this._getDateRange(options);

    const [
      revenue,
      orders,
      users,
      products,
      reviews
    ] = await Promise.all([
      this._getRevenueMetrics(startDate, endDate),
      this._getOrdersMetrics(startDate, endDate),
      this._getUsersMetrics(startDate, endDate),
      this._getProductsMetrics(startDate, endDate),
      this._getReviewsMetrics(startDate, endDate)
    ]);

    return {
      revenue,
      orders,
      users,
      products,
      reviews,
      period: {
        startDate,
        endDate
      }
    };
  }

  /**
   * Obtener métricas de ingresos
   * 
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async _getRevenueMetrics(startDate, endDate) {
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' },
          totalOrders: { $sum: 1 },
          avgOrderValue: { $avg: '$totalAmount' }
        }
      }
    ]);

    // Comparar con período anterior
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - (endDate - startDate) / (1000 * 60 * 60 * 24));
    
    const prevStats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: prevStartDate, $lt: startDate },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: { $sum: '$totalAmount' }
        }
      }
    ]);

    const current = stats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
    const previous = prevStats[0]?.totalRevenue || 0;
    
    const revenueGrowth = previous > 0 
      ? ((current.totalRevenue - previous) / previous * 100).toFixed(2)
      : 0;

    return {
      totalRevenue: current.totalRevenue,
      totalOrders: current.totalOrders,
      avgOrderValue: current.avgOrderValue,
      revenueGrowth: parseFloat(revenueGrowth)
    };
  }

  /**
   * Obtener métricas de órdenes
   * 
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async _getOrdersMetrics(startDate, endDate) {
    const [statusDistribution, dailyOrders] = await Promise.all([
      // Distribución por estado
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ]),
      // Órdenes por día
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 },
            revenue: { $sum: '$totalAmount' }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        },
        {
          $project: {
            _id: 0,
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day'
              }
            },
            count: 1,
            revenue: 1
          }
        }
      ])
    ]);

    // Formatear distribución
    const statusMap = {};
    statusDistribution.forEach(item => {
      statusMap[item._id] = item.count;
    });

    return {
      statusDistribution: statusMap,
      dailyOrders,
      totalOrders: Object.values(statusMap).reduce((sum, count) => sum + count, 0)
    };
  }

  /**
   * Obtener métricas de usuarios
   * 
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async _getUsersMetrics(startDate, endDate) {
    const [newUsers, activeUsers, userGrowth] = await Promise.all([
      // Usuarios nuevos
      User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),
      // Usuarios activos (con login reciente)
      User.countDocuments({
        lastLogin: { $gte: startDate, $lte: endDate }
      }),
      // Crecimiento por día
      User.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' },
              day: { $dayOfMonth: '$createdAt' }
            },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 }
        }
      ])
    ]);

    const totalUsers = await User.countDocuments();

    return {
      newUsers,
      activeUsers,
      totalUsers,
      userGrowth
    };
  }

  /**
   * Obtener métricas de productos
   * 
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async _getProductsMetrics(startDate, endDate) {
    const [topSelling, lowStock, mostViewed] = await Promise.all([
      // Productos más vendidos
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
          }
        },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            totalSold: { $sum: '$items.quantity' },
            revenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: 'products',
            localField: '_id',
            foreignField: '_id',
            as: 'productInfo'
          }
        },
        { $unwind: '$productInfo' },
        {
          $project: {
            _id: 0,
            productId: '$_id',
            name: '$productInfo.name',
            slug: '$productInfo.slug',
            image: { $arrayElemAt: ['$productInfo.images.url', 0] },
            totalSold: 1,
            revenue: 1
          }
        }
      ]),
      // Productos con bajo stock
      Product.find({
        stock: { $lt: 10, $gt: 0 },
        status: 'active',
        isPublished: true
      })
        .select('name slug sku stock')
        .limit(20)
        .lean(),
      // Productos más vistos
      Product.find({
        status: 'active',
        isPublished: true
      })
        .select('name slug images views')
        .sort({ views: -1 })
        .limit(10)
        .lean()
    ]);

    return {
      topSelling,
      lowStock: lowStock.length,
      lowStockProducts: lowStock,
      mostViewed
    };
  }

  /**
   * Obtener métricas de reviews
   * 
   * @param {Date} startDate
   * @param {Date} endDate
   * @returns {Promise<Object>}
   */
  async _getReviewsMetrics(startDate, endDate) {
    const [totalReviews, avgRating, ratingDistribution] = await Promise.all([
      Review.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate },
        isApproved: true
      }),
      Review.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isApproved: true
          }
        },
        {
          $group: {
            _id: null,
            avgRating: { $avg: '$rating' }
          }
        }
      ]),
      Review.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            isApproved: true
          }
        },
        {
          $group: {
            _id: '$rating',
            count: { $sum: 1 }
          }
        },
        { $sort: { '_id': -1 } }
      ])
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      totalReviews,
      avgRating: avgRating[0]?.avgRating || 0,
      ratingDistribution: distribution
    };
  }

  /**
   * Obtener ganancias mensuales
   * 
   * @param {number} months - Número de meses hacia atrás
   * @returns {Promise<Array>}
   */
  async getMonthlyRevenue(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalAmount' },
          orders: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } },
      {
        $project: {
          _id: 0,
          month: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] }
            ]
          },
          revenue: { $round: ['$revenue', 2] },
          orders: 1
        }
      }
    ]);

    return revenue;
  }

  /**
   * Obtener top productos más vendidos
   * 
   * @param {number} limit
   * @param {Object} options
   * @returns {Promise<Array>}
   */
  async getTopSellingProducts(limit = 20, options = {}) {
    const { startDate, endDate } = this._getDateRange(options);

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          status: { $in: ['confirmed', 'processing', 'shipped', 'delivered'] }
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: { $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] } }
        }
      },
      { $sort: { totalSold: -1 } },
      { $limit: limit },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      {
        $project: {
          _id: 0,
          productId: '$_id',
          name: '$product.name',
          slug: '$product.slug',
          sku: '$product.sku',
          image: { $arrayElemAt: ['$product.images.url', 0] },
          price: '$product.price',
          totalSold: 1,
          totalRevenue: { $round: ['$totalRevenue', 2] }
        }
      }
    ]);

    return topProducts;
  }

  /**
   * Obtener rango de fechas para análisis
   * 
   * @private
   * @param {Object} options
   * @returns {Object} { startDate, endDate }
   */
  _getDateRange(options) {
    const { period = 'month', startDate, endDate } = options;

    if (startDate && endDate) {
      return {
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      };
    }

    const end = new Date();
    const start = new Date();

    switch (period) {
      case 'today':
        start.setHours(0, 0, 0, 0);
        break;
      case 'week':
        start.setDate(start.getDate() - 7);
        break;
      case 'month':
        start.setMonth(start.getMonth() - 1);
        break;
      case 'quarter':
        start.setMonth(start.getMonth() - 3);
        break;
      case 'year':
        start.setFullYear(start.getFullYear() - 1);
        break;
      default:
        start.setMonth(start.getMonth() - 1);
    }

    return { startDate: start, endDate: end };
  }
}

module.exports = new AnalyticsService();