const Order = require('../orders/order.model');
const Product = require('../products/product.model');
const User = require('../auth/auth.model');
const Review = require('../reviews/review.model');
const ApiError = require('../../core/errors/ApiError');
const mongoose = require('mongoose');

/**
 * @class AnalyticsService
 * @description Lógica de negocio MEJORADA para análisis y estadísticas del sistema
 * 
 * MEJORAS IMPLEMENTADAS:
 * - Comparaciones temporales (MoM, WoW, YoY)
 * - Métricas de conversión y comportamiento
 * - Análisis por categoría y método de pago
 * - Retención y usuarios recurrentes
 * - Tiempo promedio de procesamiento
 * - Revenue por categoría
 * - Productos más vistos vs más vendidos
 * - Relación rating vs ventas
 */
class AnalyticsService {

  /**
   * MEJORADO: Dashboard con comparaciones temporales y nuevas métricas
   */
  async getDashboard(options = {}) {
    const { startDate, endDate } = this._getDateRange(options);

    // Calcular período anterior para comparaciones
    const prevPeriod = this._getPreviousPeriod(startDate, endDate);

    const [
      revenue,
      orders,
      users,
      products,
      reviews,
      conversionMetrics,
      paymentMethods,
      categoryRevenue
    ] = await Promise.all([
      this._getRevenueMetrics(startDate, endDate, prevPeriod),
      this._getOrdersMetrics(startDate, endDate, prevPeriod),
      this._getUsersMetrics(startDate, endDate, prevPeriod),
      this._getProductsMetrics(startDate, endDate),
      this._getReviewsMetrics(startDate, endDate),
      this._getConversionMetrics(startDate, endDate), // NUEVO
      this._getPaymentMethodsDistribution(startDate, endDate), // NUEVO
      this._getRevenueByCategory(startDate, endDate) // NUEVO
    ]);

    return {
      revenue,
      orders,
      users,
      products,
      reviews,
      conversionMetrics, // NUEVO
      paymentMethods, // NUEVO
      categoryRevenue, // NUEVO
      period: {
        startDate,
        endDate,
        previousStartDate: prevPeriod.startDate,
        previousEndDate: prevPeriod.endDate
      }
    };
  }

  /**
   * MEJORADO: Revenue con comparaciones y crecimiento real
   */
  async _getRevenueMetrics(startDate, endDate, prevPeriod) {
    const [currentStats, prevStats] = await Promise.all([
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid'
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
      ]),
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: prevPeriod.startDate, $lt: prevPeriod.endDate },
            paymentStatus: 'paid'
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
      ])
    ]);

    const current = currentStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };
    const previous = prevStats[0] || { totalRevenue: 0, totalOrders: 0, avgOrderValue: 0 };

    // Calcular crecimientos reales
    const revenueGrowth = previous.totalRevenue > 0
      ? ((current.totalRevenue - previous.totalRevenue) / previous.totalRevenue * 100)
      : 0;

    const ordersGrowth = previous.totalOrders > 0
      ? ((current.totalOrders - previous.totalOrders) / previous.totalOrders * 100)
      : 0;

    const aovGrowth = previous.avgOrderValue > 0
      ? ((current.avgOrderValue - previous.avgOrderValue) / previous.avgOrderValue * 100)
      : 0;

    return {
      totalRevenue: Number(current.totalRevenue.toFixed(2)),
      totalOrders: current.totalOrders,
      avgOrderValue: Number(current.avgOrderValue.toFixed(2)),
      revenueGrowth: Number(revenueGrowth.toFixed(2)),
      ordersGrowth: Number(ordersGrowth.toFixed(2)),
      aovGrowth: Number(aovGrowth.toFixed(2)),
      comparison: {
        previousRevenue: Number(previous.totalRevenue.toFixed(2)),
        previousOrders: previous.totalOrders,
        previousAOV: Number(previous.avgOrderValue.toFixed(2))
      }
    };
  }

  /**
   * MEJORADO: Órdenes con métricas avanzadas
   */
  async _getOrdersMetrics(startDate, endDate, prevPeriod) {
    const [
      statusDistribution,
      dailyOrders,
      processingTime,
      cancelledReasons,
      currentCount,
      prevCount
    ] = await Promise.all([
      // Distribución por estado
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),

      // Órdenes por día
      Order.aggregate([
        { $match: { createdAt: { $gte: startDate, $lte: endDate } } },
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
        { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
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
            revenue: { $round: ['$revenue', 2] }
          }
        }
      ]),

      // NUEVO: Tiempo promedio de procesamiento (pending -> delivered)
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            deliveredAt: { $ne: null }
          }
        },
        {
          $project: {
            processingDays: {
              $divide: [
                { $subtract: ['$deliveredAt', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingDays: { $avg: '$processingDays' },
            minDays: { $min: '$processingDays' },
            maxDays: { $max: '$processingDays' }
          }
        }
      ]),

      // NUEVO: Análisis de órdenes canceladas
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'cancelled'
          }
        },
        {
          $group: {
            _id: '$adminNotes',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: 5 }
      ]),

      // Conteo actual
      Order.countDocuments({ createdAt: { $gte: startDate, $lte: endDate } }),

      // Conteo período anterior
      Order.countDocuments({
        createdAt: { $gte: prevPeriod.startDate, $lt: prevPeriod.endDate }
      })
    ]);

    // Formatear distribución
    const statusMap = {};
    statusDistribution.forEach(item => {
      statusMap[item._id] = item.count;
    });

    // Calcular crecimiento
    const ordersGrowth = prevCount > 0
      ? ((currentCount - prevCount) / prevCount * 100)
      : 0;

    return {
      statusDistribution: statusMap,
      dailyOrders,
      totalOrders: currentCount,
      ordersGrowth: Number(ordersGrowth.toFixed(2)),
      processingTime: processingTime[0] || {
        avgProcessingDays: 0,
        minDays: 0,
        maxDays: 0
      },
      cancelledAnalysis: cancelledReasons.map(r => ({
        reason: r._id || 'Sin especificar',
        count: r.count
      })),
      comparison: {
        previousOrders: prevCount
      }
    };
  }

  /**
   * MEJORADO: Usuarios con retención y recurrencia
   */
  async _getUsersMetrics(startDate, endDate, prevPeriod) {
    const [
      newUsers,
      activeUsers,
      prevNewUsers,
      recurringCustomers,
      userRetention
    ] = await Promise.all([
      // Usuarios nuevos (período actual)
      User.countDocuments({
        createdAt: { $gte: startDate, $lte: endDate }
      }),

      // Usuarios activos (con login reciente)
      User.countDocuments({
        lastLogin: { $gte: startDate, $lte: endDate }
      }),

      // Usuarios nuevos (período anterior)
      User.countDocuments({
        createdAt: { $gte: prevPeriod.startDate, $lt: prevPeriod.endDate }
      }),

      // NUEVO: Usuarios con más de una compra
      Order.aggregate([
        {
          $match: {
            createdAt: { $gte: startDate, $lte: endDate },
            paymentStatus: 'paid'
          }
        },
        {
          $group: {
            _id: '$user',
            orderCount: { $sum: 1 }
          }
        },
        {
          $match: {
            orderCount: { $gt: 1 }
          }
        },
        {
          $count: 'recurringCount'
        }
      ]),

      // NUEVO: Tasa de retención (usuarios del período anterior que compraron en actual)
      this._calculateUserRetention(prevPeriod.startDate, prevPeriod.endDate, startDate, endDate)
    ]);

    const totalUsers = await User.countDocuments();

    const userGrowth = prevNewUsers > 0
      ? ((newUsers - prevNewUsers) / prevNewUsers * 100)
      : 0;

    return {
      newUsers,
      activeUsers,
      totalUsers,
      userGrowth: Number(userGrowth.toFixed(2)),
      recurringCustomers: recurringCustomers[0]?.recurringCount || 0,
      retentionRate: userRetention.retentionRate,
      comparison: {
        previousNewUsers: prevNewUsers
      }
    };
  }

  /**
   * NUEVO: Cálculo de retención de usuarios
   */
  async _calculateUserRetention(prevStart, prevEnd, currentStart, currentEnd) {
    // Usuarios que compraron en período anterior
    const prevBuyers = await Order.distinct('user', {
      createdAt: { $gte: prevStart, $lt: prevEnd },
      paymentStatus: 'paid'
    });

    if (prevBuyers.length === 0) {
      return { retentionRate: 0, retainedUsers: 0 };
    }

    // De esos, cuántos compraron en período actual
    const retainedUsers = await Order.countDocuments({
      user: { $in: prevBuyers },
      createdAt: { $gte: currentStart, $lte: currentEnd },
      paymentStatus: 'paid'
    });

    const retentionRate = (retainedUsers / prevBuyers.length * 100);

    return {
      retentionRate: Number(retentionRate.toFixed(2)),
      retainedUsers,
      totalPreviousBuyers: prevBuyers.length
    };
  }

  /**
   * MEJORADO: Productos con análisis avanzado
   */
  async _getProductsMetrics(startDate, endDate) {
    const [
      topSelling,
      lowStock,
      mostViewed,
      bestConversion,
      viewsVsSales
    ] = await Promise.all([
      // Top vendidos
      this._getTopSellingProducts(10, { startDate, endDate }),

      // Bajo stock
      Product.find({
        stock: { $lt: 10, $gt: 0 },
        status: 'active',
        isPublished: true
      })
        .select('name slug sku stock _id')
        .limit(20)
        .lean(),

      // Más vistos
      Product.find({
        status: 'active',
        isPublished: true
      })
        .select('name slug images views _id')
        .sort({ views: -1 })
        .limit(10)
        .lean(),

      // NUEVO: Mejor conversión (vistas vs ventas)
      this._getBestConversionProducts(startDate, endDate),

      // NUEVO: Comparación vistas vs ventas
      this._getViewsVsSalesComparison(startDate, endDate)
    ]);

    return {
      topSelling,
      lowStock: lowStock.length,
      lowStockProducts: lowStock,
      mostViewed,
      bestConversion, // NUEVO
      viewsVsSales // NUEVO
    };
  }

  /**
   * NUEVO: Productos con mejor tasa de conversión
   */
  async _getBestConversionProducts(startDate, endDate) {
    const products = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
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
          name: '$product.name',
          views: '$product.views',
          totalSold: 1,
          conversionRate: {
            $cond: [
              { $gt: ['$product.views', 0] },
              { $multiply: [{ $divide: ['$totalSold', '$product.views'] }, 100] },
              0
            ]
          }
        }
      },
      { $match: { views: { $gt: 0 } } },
      { $sort: { conversionRate: -1 } },
      { $limit: 10 }
    ]);

    return products.map(p => ({
      name: p.name,
      views: p.views,
      sales: p.totalSold,
      conversionRate: Number(p.conversionRate.toFixed(2))
    }));
  }

  /**
   * NUEVO: Comparación general vistas vs ventas
   */
  async _getViewsVsSalesComparison(startDate, endDate) {
    const stats = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
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
        $group: {
          _id: null,
          totalViews: { $sum: '$product.views' },
          totalSales: { $sum: '$totalSold' },
          avgConversionRate: {
            $avg: {
              $cond: [
                { $gt: ['$product.views', 0] },
                { $multiply: [{ $divide: ['$totalSold', '$product.views'] }, 100] },
                0
              ]
            }
          }
        }
      }
    ]);

    return stats[0] || {
      totalViews: 0,
      totalSales: 0,
      avgConversionRate: 0
    };
  }

  /**
   * MEJORADO: Reviews con relación rating vs ventas
   */
  async _getReviewsMetrics(startDate, endDate) {
    const [
      totalReviews,
      avgRating,
      ratingDistribution,
      topRatedProducts,
      ratingVsSales
    ] = await Promise.all([
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
      ]),

      // NUEVO: Productos mejor calificados
      Product.find({
        status: 'active',
        isPublished: true,
        'rating.count': { $gte: 3 }
      })
        .select('name slug rating.average rating.count')
        .sort({ 'rating.average': -1, 'rating.count': -1 })
        .limit(10)
        .lean(),

      // NUEVO: Relación rating vs ventas
      this._getRatingVsSalesCorrelation(startDate, endDate)
    ]);

    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    ratingDistribution.forEach(item => {
      distribution[item._id] = item.count;
    });

    return {
      totalReviews,
      avgRating: avgRating[0]?.avgRating || 0,
      ratingDistribution: distribution,
      topRatedProducts, // NUEVO
      ratingVsSales // NUEVO
    };
  }

  /**
   * NUEVO: Correlación rating vs ventas
   */
  async _getRatingVsSalesCorrelation(startDate, endDate) {
    const correlation = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' }
        }
      },
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
        $match: {
          'product.rating.count': { $gte: 3 }
        }
      },
      {
        $group: {
          _id: {
            $switch: {
              branches: [
                { case: { $gte: ['$product.rating.average', 4.5] }, then: '4.5+' },
                { case: { $gte: ['$product.rating.average', 4.0] }, then: '4.0-4.5' },
                { case: { $gte: ['$product.rating.average', 3.5] }, then: '3.5-4.0' },
                { case: { $gte: ['$product.rating.average', 3.0] }, then: '3.0-3.5' }
              ],
              default: '<3.0'
            }
          },
          avgSales: { $avg: '$totalSold' },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id': -1 } }
    ]);

    return correlation.map(c => ({
      ratingRange: c._id,
      avgSales: Number(c.avgSales.toFixed(2)),
      productCount: c.count
    }));
  }

  /**
   * NUEVO: Métricas de conversión
   */
  async _getConversionMetrics(startDate, endDate) {
    const [visitors, buyers] = await Promise.all([
      User.countDocuments({
        lastLogin: { $gte: startDate, $lte: endDate }
      }),

      Order.distinct('user', {
        createdAt: { $gte: startDate, $lte: endDate },
        paymentStatus: 'paid'
      })
    ]);

    const conversionRate = visitors > 0
      ? (buyers.length / visitors * 100)
      : 0;

    return {
      totalVisitors: visitors,
      totalBuyers: buyers.length,
      conversionRate: Number(conversionRate.toFixed(2))
    };
  }

  /**
   * NUEVO: Distribución por métodos de pago
   */
  async _getPaymentMethodsDistribution(startDate, endDate) {
    const distribution = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      {
        $group: {
          _id: '$paymentMethod',
          count: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { count: -1 } }
    ]);

    return distribution.map(d => ({
      method: d._id,
      orders: d.count,
      revenue: Number(d.totalRevenue.toFixed(2))
    }));
  }

  /**
   * NUEVO: Revenue por categoría
   */
  async _getRevenueByCategory(startDate, endDate) {
    const categoryRevenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $lookup: {
          from: 'products',
          localField: 'items.product',
          foreignField: '_id',
          as: 'productData'
        }
      },
      { $unwind: '$productData' },
      { $unwind: { path: '$productData.categories', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'categories',
          localField: 'productData.categories',
          foreignField: '_id',
          as: 'category'
        }
      },
      { $unwind: { path: '$category', preserveNullAndEmptyArrays: true } },
      {
        $group: {
          _id: '$category._id',
          categoryName: { $first: '$category.name' },
          totalRevenue: {
            $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] }
          },
          orderCount: { $sum: 1 },
          itemsSold: { $sum: '$items.quantity' }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    return categoryRevenue.map(c => ({
      categoryId: c._id,
      categoryName: c.categoryName || 'Sin categoría',
      revenue: Number(c.totalRevenue.toFixed(2)),
      orders: c.orderCount,
      itemsSold: c.itemsSold
    }));
  }

  /**
   * Revenue mensual (sin cambios - ya está bien)
   */
  async getMonthlyRevenue(months = 12) {
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    const revenue = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate },
          paymentStatus: 'paid'
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
              {
                $cond: [
                  { $lt: ['$_id.month', 10] },
                  { $concat: ['0', { $toString: '$_id.month' }] },
                  { $toString: '$_id.month' }
                ]
              }
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
   * Top productos (sin cambios - ya está bien)
   */
  async getTopSellingProducts(limit = 20, options = {}) {
    const { startDate, endDate } = this._getDateRange(options);

    const topProducts = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: startDate, $lte: endDate },
          paymentStatus: 'paid'
        }
      },
      { $unwind: '$items' },
      {
        $group: {
          _id: '$items.product',
          totalSold: { $sum: '$items.quantity' },
          totalRevenue: {
            $sum: { $multiply: ['$items.unitPrice', '$items.quantity'] }
          }
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
   * HELPER: Calcular período anterior
   */
  _getPreviousPeriod(startDate, endDate) {
    const duration = endDate - startDate;
    const prevEndDate = new Date(startDate);
    const prevStartDate = new Date(startDate.getTime() - duration);

    return {
      startDate: prevStartDate,
      endDate: prevEndDate
    };
  }

  /**
   * HELPER: Obtener rango de fechas
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