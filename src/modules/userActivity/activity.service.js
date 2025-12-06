const mongoose = require('mongoose');
const UserActivity = require('./activity.model');
const ApiError = require('../../core/errors/ApiError');

// ✅ MEJORADO: Validación de dependencia opcional
let UAParser;
try {
  UAParser = require('ua-parser-js');
} catch (error) {
  console.warn('⚠️ ua-parser-js no instalado. User agent parsing deshabilitado.');
  console.warn('💡 Instalar con: npm install ua-parser-js');
}

/**
 * @class UserActivityService
 * @description Lógica de negocio para actividad del usuario
 * 
 * Responsabilidades:
 * - Registrar actividades
 * - Análisis de comportamiento
 * - Detección de patrones
 * - Recomendaciones basadas en historial
 */
class UserActivityService {
  /**
   * Registrar actividad
   * 
   * @param {Object} activityData - Datos de la actividad
   * @returns {Promise<Object>}
   */
  async logActivity(activityData) {
    try {
      const {
        userId,
        activityType,
        resource,
        metadata,
        sessionId,
        ipAddress,
        userAgent,
        referrer,
        duration
      } = activityData;

      // Parsear user agent
      const deviceInfo = this._parseUserAgent(userAgent);

      const activity = await UserActivity.create({
        user: userId || undefined,
        activityType,
        resource,
        metadata,
        sessionId,
        ipAddress,
        userAgent,
        device: deviceInfo.device,
        browser: deviceInfo.browser,
        os: deviceInfo.os,
        referrer,
        duration,
        timestamp: new Date()
      });

      return activity;
    } catch (error) {
      console.error('Error en logActivity:', error);
      throw ApiError.internal('Error al registrar actividad');
    }
  }

  /**
   * Obtener actividad reciente del usuario
   * 
   * @param {string} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentActivity(userId, limit = 50) {
    try {
      return await UserActivity.getRecentActivity(userId, limit);
    } catch (error) {
      console.error('Error en getRecentActivity:', error);
      throw ApiError.internal('Error al obtener actividad reciente');
    }
  }

  /**
   * Obtener productos vistos
   * 
   * @param {string} userId
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getProductViews(userId, days = 30) {
    try {
      return await UserActivity.getProductViews(userId, days);
    } catch (error) {
      console.error('Error en getProductViews:', error);
      throw ApiError.internal('Error al obtener productos vistos');
    }
  }

  /**
   * Obtener carritos abandonados
   * 
   * @param {number} hours
   * @returns {Promise<Array>}
   */
  async getAbandonedCarts(hours = 24) {
    try {
      return await UserActivity.getAbandonedCarts(hours);
    } catch (error) {
      console.error('Error en getAbandonedCarts:', error);
      throw ApiError.internal('Error al obtener carritos abandonados');
    }
  }

  /**
   * Obtener estadísticas de actividad del usuario
   * 
   * 
   * @param {string} userId
   * @param {number} days
   * @returns {Promise<Object>}
   */
  async getUserStats(userId, days = 30) {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const stats = await UserActivity.aggregate([
        {
          
          $match: {
            user: userId, // Mongoose hace cast automático
            timestamp: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 }
          }
        }
      ]);

      const formatted = {};
      stats.forEach(stat => {
        formatted[stat._id] = stat.count;
      });

      return {
        period: { days, startDate },
        activities: formatted,
        totalActivities: stats.reduce((sum, s) => sum + s.count, 0)
      };
    } catch (error) {
      console.error('Error en getUserStats:', error);
      throw ApiError.internal('Error al obtener estadísticas');
    }
  }

  /**
   * Obtener patrón de comportamiento
   * 
   * @param {string} userId
   * @returns {Promise<Object>}
   */
  async getUserBehaviorPattern(userId) {
    try {
      const [recentActivity, productViews, stats] = await Promise.all([
        this.getRecentActivity(userId, 20),
        this.getProductViews(userId, 30),
        this.getUserStats(userId, 30)
      ]);

      // Detectar patrones
      const pattern = {
        isActiveUser: stats.totalActivities > 10,
        isFrequentBuyer: (stats.activities.order_completed || 0) > 2,
        browsesOften: (stats.activities.product_view || 0) > 20,
        abandonsCart: (stats.activities.add_to_cart || 0) > (stats.activities.order_completed || 0),
        usesWishlist: (stats.activities.add_to_wishlist || 0) > 0,
        topViewedProducts: productViews.slice(0, 5)
      };

      return pattern;
    } catch (error) {
      console.error('Error en getUserBehaviorPattern:', error);
      throw ApiError.internal('Error al obtener patrón de comportamiento');
    }
  }

  /**
   * Parsear User Agent
   * @private
   */
  _parseUserAgent(userAgent) {
    if (!UAParser || !userAgent) {
      return { device: 'unknown', browser: 'unknown', os: 'unknown' };
    }

    try {
      const parser = new UAParser(userAgent);
      const result = parser.getResult();

      let device = 'desktop';
      if (result.device.type === 'mobile') device = 'mobile';
      else if (result.device.type === 'tablet') device = 'tablet';

      return {
        device,
        browser: result.browser.name || 'unknown',
        os: result.os.name || 'unknown'
      };
    } catch (error) {
      console.error('Error parseando user agent:', error);
      return { device: 'unknown', browser: 'unknown', os: 'unknown' };
    }
  }
}

module.exports = new UserActivityService();