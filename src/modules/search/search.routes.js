const express = require('express');
const router = express.Router();
const searchController = require('./search.controller');
const { validate, searchValidation } = require('./search.validation');
const { authMiddleware, requireRole } = require('../../middleware/auth');

/**
 * RUTAS PÚBLICAS
 */

/**
 * @route   GET /api/search/suggestions
 * @desc    Obtener sugerencias de búsqueda
 * @access  Public
 */
router.get(
  '/suggestions', 
  validate(searchValidation.getSearchSuggestions),
  searchController.getSearchSuggestions
);

/**
 * @route   GET /api/search/popular
 * @desc    Obtener búsquedas populares
 * @access  Public
 */
router.get(
  '/popular', 
  validate(searchValidation.getPopularSearches),
  searchController.getPopularSearches
);

/**
 * @route   GET /api/search/trending
 * @desc    Obtener búsquedas en tendencia
 * @access  Public
 */
router.get(
  '/trending', 
  validate(searchValidation.getTrendingSearches),
  searchController.getTrendingSearches
);

/**
 * RUTAS PRIVADAS
 */

/**
 * @route   GET /api/search/history
 * @desc    Obtener historial personal
 * @access  Private
 */
router.get(
  '/history', 
  authMiddleware, 
  validate(searchValidation.getUserSearchHistory),
  searchController.getUserSearchHistory
);

/**
 * RUTAS ADMIN
 */

/**
 * @route   GET /api/search/admin/failed
 * @desc    Obtener búsquedas fallidas
 * @access  Private/Admin
 */
router.get(
  '/admin/failed',
  authMiddleware,
  requireRole('admin', 'moderator'),
  validate(searchValidation.getFailedSearches),
  searchController.getFailedSearches
);

/**
 * @route   GET /api/search/admin/stats
 * @desc    Obtener estadísticas generales
 * @access  Private/Admin
 */
router.get(
  '/admin/stats',
  authMiddleware,
  requireRole('admin', 'moderator'),
  validate(searchValidation.getSearchStats),
  searchController.getSearchStats
);

module.exports = router;