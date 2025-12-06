const searchService = require('./search.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class SearchController
 * @description Controlador para historial y análisis de búsquedas
 */

/**
 * @desc    Obtener sugerencias de búsqueda
 * @route   GET /api/search/suggestions?q=prefix
 * @access  Public
 */
const getSearchSuggestions = catchAsync(async (req, res) => {
  const { q, limit = 5 } = req.query;

  const suggestions = await searchService.getSearchSuggestions(q, parseInt(limit));

  res.json({
    success: true,
    count: suggestions.length,
    data: suggestions
  });
});

/**
 * @desc    Obtener búsquedas populares
 * @route   GET /api/search/popular
 * @access  Public
 */
const getPopularSearches = catchAsync(async (req, res) => {
  const { limit = 10, days = 30 } = req.query;

  const popular = await searchService.getPopularSearches(
    parseInt(limit),
    parseInt(days)
  );

  res.json({
    success: true,
    count: popular.length,
    data: popular
  });
});

/**
 * @desc    Obtener búsquedas en tendencia
 * @route   GET /api/search/trending
 * @access  Public
 */
const getTrendingSearches = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;

  const trending = await searchService.getTrendingSearches(parseInt(limit));

  res.json({
    success: true,
    count: trending.length,
    data: trending
  });
});

/**
 * @desc    Obtener historial de búsqueda del usuario
 * @route   GET /api/search/history
 * @access  Private
 */
const getUserSearchHistory = catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;

  const history = await searchService.getUserSearchHistory(
    req.user._id,
    parseInt(limit)
  );

  res.json({
    success: true,
    count: history.length,
    data: history
  });
});

/**
 * @desc    Obtener búsquedas fallidas (Admin)
 * @route   GET /api/search/admin/failed
 * @access  Private/Admin
 */
const getFailedSearches = catchAsync(async (req, res) => {
  const { limit = 20, days = 30 } = req.query;

  const failed = await searchService.getFailedSearches(
    parseInt(limit),
    parseInt(days)
  );

  res.json({
    success: true,
    count: failed.length,
    data: failed
  });
});

/**
 * @desc    Obtener estadísticas de búsqueda (Admin)
 * @route   GET /api/search/admin/stats
 * @access  Private/Admin
 */
const getSearchStats = catchAsync(async (req, res) => {
  const { days = 30 } = req.query;

  const stats = await searchService.getSearchStats(parseInt(days));

  res.json({
    success: true,
    data: stats
  });
});

module.exports = {
  getSearchSuggestions,
  getPopularSearches,
  getTrendingSearches,
  getUserSearchHistory,
  getFailedSearches,
  getSearchStats
};