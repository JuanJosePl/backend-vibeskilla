const Search = require('./search.model');
const Product = require('../products/product.model');

/**
 * @class SearchService
 * @description Lógica de negocio para historial y análisis de búsquedas
 * 
 * Responsabilidades:
 * - Registrar búsquedas
 * - Generar sugerencias
 * - Análisis de tendencias
 * - Optimización de búsqueda
 */
class SearchService {
  /**
   * Registrar una búsqueda
   * 
   * @param {Object} data - Datos de la búsqueda
   * @returns {Promise<Object>}
   */
  async logSearch(data) {
    const {
      query,
      userId = null,
      ipAddress,
      resultsCount = 0,
      category = null,
      filters = {},
      deviceType = 'desktop',
      userAgent
    } = data;

    const search = await Search.create({
      query: query.trim().toLowerCase(),
      user: userId,
      ipAddress,
      resultsCount,
      category,
      filters,
      deviceType,
      userAgent
    });

    return search;
  }

  /**
   * Registrar clic en resultado
   * 
   * @param {string} searchId - ID de la búsqueda
   * @param {string} productId - ID del producto clickeado
   * @param {number} position - Posición en resultados
   * @returns {Promise<Object>}
   */
  async logClick(searchId, productId, position) {
    const search = await Search.findByIdAndUpdate(
      searchId,
      {
        clicked: true,
        clickedProduct: productId,
        clickPosition: position
      },
      { new: true }
    );

    return search;
  }

  /**
   * Obtener búsquedas populares
   * 
   * @param {number} limit
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getPopularSearches(limit = 10, days = 30) {
    return await Search.getPopularSearches(limit, days);
  }

  /**
   * Obtener búsquedas en tendencia
   * 
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getTrendingSearches(limit = 10) {
    return await Search.getTrendingSearches(limit);
  }

  /**
   * Obtener sugerencias de búsqueda
   * 
   * @param {string} prefix - Prefijo
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getSearchSuggestions(prefix, limit = 5) {
    if (!prefix || prefix.length < 2) {
      return [];
    }

    // Combinar sugerencias del historial y productos
    const [historySuggestions, productSuggestions] = await Promise.all([
      Search.getSearchSuggestions(prefix, limit),
      this._getProductSuggestions(prefix, limit)
    ]);

    // Merge y deduplicar
    const allSuggestions = [...historySuggestions, ...productSuggestions];
    const unique = Array.from(new Set(allSuggestions.map(s => s.suggestion)))
      .map(suggestion => {
        return allSuggestions.find(s => s.suggestion === suggestion);
      })
      .slice(0, limit);

    return unique;
  }

  /**
   * Obtener sugerencias desde productos
   * 
   * @private
   * @param {string} prefix
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async _getProductSuggestions(prefix, limit) {
    const regex = new RegExp(prefix, 'i');

    const products = await Product.find({
      $or: [
        { name: regex },
        { brand: regex },
        { tags: { $in: [regex] } }
      ],
      status: 'active',
      isPublished: true
    })
      .select('name brand')
      .limit(limit)
      .lean();

    return products.map(p => ({
      suggestion: p.name.toLowerCase(),
      popularity: 0
    }));
  }

  /**
   * Obtener búsquedas fallidas (sin resultados)
   * 
   * @param {number} limit
   * @param {number} days
   * @returns {Promise<Array>}
   */
  async getFailedSearches(limit = 20, days = 30) {
    return await Search.getFailedSearches(limit, days);
  }

  /**
   * Obtener historial de búsqueda del usuario
   * 
   * @param {string} userId
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getUserSearchHistory(userId, limit = 20) {
    const history = await Search.find({ user: userId })
      .select('query resultsCount clicked createdAt')
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return history;
  }

  /**
   * Obtener estadísticas de búsqueda
   * 
   * @param {number} days
   * @returns {Promise<Object>}
   */
  async getSearchStats(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const [totalSearches, uniqueQueries, avgResults, clickThrough, failedSearches] = await Promise.all([
      Search.countDocuments({ createdAt: { $gte: startDate } }),
      Search.distinct('query', { createdAt: { $gte: startDate } }).then(arr => arr.length),
      Search.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, avg: { $avg: '$resultsCount' } } }
      ]),
      Search.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, clickRate: { $avg: { $cond: ['$clicked', 1, 0] } } } }
      ]),
      Search.countDocuments({ createdAt: { $gte: startDate }, resultsCount: 0 })
    ]);

    return {
      totalSearches,
      uniqueQueries,
      avgResults: avgResults[0]?.avg || 0,
      clickThroughRate: (clickThrough[0]?.clickRate || 0) * 100,
      failedSearches,
      failedRate: totalSearches > 0 ? (failedSearches / totalSearches * 100).toFixed(2) : 0,
      period: days
    };
  }
}

module.exports = new SearchService();