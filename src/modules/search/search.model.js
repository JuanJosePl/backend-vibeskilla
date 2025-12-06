const mongoose = require('mongoose');

/**
 * @schema searchSchema
 * @description Esquema para historial de búsquedas
 * 
 * SOURCE OF TRUTH para analíticas de búsqueda
 */
const searchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: [true, 'La consulta de búsqueda es requerida'],
    trim: true,
    lowercase: true, // Normalizar para análisis
    index: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null // Permitir búsquedas anónimas
  },
  // IP para análisis de búsquedas anónimas
  ipAddress: {
    type: String,
    select: false // No exponer en queries normales
  },
  // Resultados encontrados
  resultsCount: {
    type: Number,
    default: 0,
    min: 0
  },
  // Categoría filtrada (si aplica)
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  // Filtros aplicados
  filters: {
    minPrice: Number,
    maxPrice: Number,
    rating: Number,
    brand: String
  },
  // ¿El usuario hizo clic en algún resultado?
  clicked: {
    type: Boolean,
    default: false
  },
  // Producto en el que hizo clic (si aplica)
  clickedProduct: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null
  },
  // Posición del producto clickeado en los resultados
  clickPosition: {
    type: Number,
    min: 0
  },
  // Tiempo en la página de resultados (segundos)
  timeOnResults: {
    type: Number,
    default: 0
  },
  // Dispositivo
  deviceType: {
    type: String,
    enum: ['desktop', 'mobile', 'tablet'],
    default: 'desktop'
  },
  // User Agent (útil para análisis)
  userAgent: {
    type: String,
    select: false
  }
}, {
  timestamps: true
});

// 📌 INDEXES
searchSchema.index({ query: 1, createdAt: -1 });
searchSchema.index({ user: 1, createdAt: -1 });
searchSchema.index({ resultsCount: 1 });
searchSchema.index({ clicked: 1 });
searchSchema.index({ createdAt: -1 });
searchSchema.index({ query: 'text' }); // Full-text para análisis

/**
 * @static getPopularSearches
 * @description Obtiene las búsquedas más populares
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} days - Días hacia atrás
 * @returns {Promise<Array>}
 */
searchSchema.statics.getPopularSearches = function(limit = 10, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate }
      }
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        avgResults: { $avg: '$resultsCount' },
        clickRate: {
          $avg: { $cond: ['$clicked', 1, 0] }
        }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: '$_id',
        count: 1,
        avgResults: { $round: ['$avgResults', 0] },
        clickRate: { $multiply: [{ $round: ['$clickRate', 2] }, 100] }
      }
    }
  ]);
};

/**
 * @static getTrendingSearches
 * @description Obtiene búsquedas en tendencia (incremento reciente)
 * 
 * @param {number} limit - Límite de resultados
 * @returns {Promise<Array>}
 */
searchSchema.statics.getTrendingSearches = function(limit = 10) {
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: weekAgo }
      }
    },
    {
      $group: {
        _id: '$query',
        recentCount: {
          $sum: { $cond: [{ $gte: ['$createdAt', yesterday] }, 1, 0] }
        },
        totalCount: { $sum: 1 }
      }
    },
    {
      $match: {
        recentCount: { $gte: 3 } // Al menos 3 búsquedas recientes
      }
    },
    {
      $project: {
        _id: 0,
        query: '$_id',
        recentCount: 1,
        totalCount: 1,
        trendScore: {
          $divide: ['$recentCount', '$totalCount']
        }
      }
    },
    { $sort: { trendScore: -1, recentCount: -1 } },
    { $limit: limit }
  ]);
};

/**
 * @static getSearchSuggestions
 * @description Obtiene sugerencias basadas en prefijo
 * 
 * @param {string} prefix - Prefijo de búsqueda
 * @param {number} limit - Límite de sugerencias
 * @returns {Promise<Array>}
 */
searchSchema.statics.getSearchSuggestions = function(prefix, limit = 5) {
  const regex = new RegExp(`^${prefix}`, 'i');

  return this.aggregate([
    {
      $match: {
        query: regex,
        resultsCount: { $gt: 0 } // Solo búsquedas con resultados
      }
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 },
        avgResults: { $avg: '$resultsCount' }
      }
    },
    { $sort: { count: -1, avgResults: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        suggestion: '$_id',
        popularity: '$count'
      }
    }
  ]);
};

/**
 * @static getFailedSearches
 * @description Obtiene búsquedas sin resultados
 * 
 * @param {number} limit - Límite de resultados
 * @param {number} days - Días hacia atrás
 * @returns {Promise<Array>}
 */
searchSchema.statics.getFailedSearches = function(limit = 20, days = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return this.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate },
        resultsCount: 0
      }
    },
    {
      $group: {
        _id: '$query',
        count: { $sum: 1 }
      }
    },
    { $sort: { count: -1 } },
    { $limit: limit },
    {
      $project: {
        _id: 0,
        query: '$_id',
        failedCount: '$count'
      }
    }
  ]);
};

module.exports = mongoose.model('Search', searchSchema);