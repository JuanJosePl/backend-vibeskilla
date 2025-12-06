const express = require('express');
const router = express.Router();
const activityController = require('./activity.controller');
const { validate, logActivityValidation, getActivityValidation } = require('./activity.validation');
const { authMiddleware, requireRole } = require('../../middleware/auth');

/**
 * @route   POST /api/activity
 * @desc    Registrar actividad
 * @access  Public/Private (detecta automáticamente)
 */
router.post(
  '/',
  validate(logActivityValidation),
  activityController.logActivity
);

/**
 * RUTAS PROTEGIDAS - USUARIO
 */

// GET /api/activity/recent - Actividad reciente
router.get(
  '/recent',
  authMiddleware,
  validate(getActivityValidation),
  activityController.getRecentActivity
);

// GET /api/activity/products/viewed - Productos vistos
router.get(
  '/products/viewed',
  authMiddleware,
  validate(getActivityValidation),
  activityController.getProductViews
);

// GET /api/activity/stats - Estadísticas
router.get(
  '/stats',
  authMiddleware,
  validate(getActivityValidation),
  activityController.getUserStats
);

// GET /api/activity/behavior - Patrón de comportamiento
router.get(
  '/behavior',
  authMiddleware,
  activityController.getBehaviorPattern
);

/**
 * RUTAS PROTEGIDAS - ADMIN
 */

// GET /api/activity/abandoned-carts - Carritos abandonados
router.get(
  '/abandoned-carts',
  authMiddleware,
  requireRole('admin', 'moderator'),
  activityController.getAbandonedCarts
);

module.exports = router;