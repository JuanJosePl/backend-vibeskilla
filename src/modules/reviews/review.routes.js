// src/modules/reviews/review.routes.js

const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const { validate, reviewValidation } = require('./review.validation');
const { authMiddleware, requireRole } = require('../../middleware/auth');

/**
 * @description Rutas del módulo REVIEWS
 * 
 * Estructura:
 * - GET /products/:productId - Obtener reviews (público)
 * - GET /products/:productId/stats - Estadísticas (público)
 * - POST /products/:productId - Crear review (usuario)
 * - PUT /:id - Actualizar review (usuario)
 * - DELETE /:id - Eliminar review (usuario)
 * - POST /:id/helpful - Marcar útil (usuario)
 * - POST /:id/report - Reportar (usuario)
 * - /admin/* - Rutas administrativas
 */

// ============================================
// RUTAS PÚBLICAS
// ============================================

/**
 * GET /api/reviews/products/:productId
 * Obtener reviews de un producto
 */
router.get(
  '/products/:productId',
  validate(reviewValidation.getProductReviews),
  reviewController.getProductReviews
);

/**
 * GET /api/reviews/products/:productId/stats
 * Obtener estadísticas de reviews
 */
router.get(
  '/products/:productId/stats',
  validate(reviewValidation.productId),
  reviewController.getReviewStats
);

// ============================================
// RUTAS PROTEGIDAS (Usuario autenticado)
// ============================================

/**
 * POST /api/reviews/products/:productId
 * Crear review para un producto
 */
router.post(
  '/products/:productId',
  authMiddleware,
  validate(reviewValidation.createReview),
  reviewController.createReview
);

/**
 * PUT /api/reviews/:id
 * Actualizar review propia
 */
router.put(
  '/:id',
  authMiddleware,
  validate(reviewValidation.updateReview),
  reviewController.updateReview
);

/**
 * DELETE /api/reviews/:id
 * Eliminar review propia
 */
router.delete(
  '/:id',
  authMiddleware,
  validate(reviewValidation.reviewId),
  reviewController.deleteReview
);

/**
 * POST /api/reviews/:id/helpful
 * Marcar review como útil
 */
router.post(
  '/:id/helpful',
  authMiddleware,
  validate(reviewValidation.reviewId),
  reviewController.markAsHelpful
);

/**
 * POST /api/reviews/:id/report
 * Reportar review inapropiada
 */
router.post(
  '/:id/report',
  authMiddleware,
  validate(reviewValidation.reportReview),
  reviewController.reportReview
);

// ============================================
// RUTAS ADMINISTRATIVAS
// ============================================

// Middleware: requiere admin/moderator
router.use('/admin', authMiddleware, requireRole('admin', 'moderator'));

/**
 * GET /api/reviews/admin/pending
 * Obtener reviews pendientes de moderación
 */
router.get(
  '/admin/pending',
  validate(reviewValidation.getPending),
  reviewController.getPendingReviews
);

/**
 * PUT /api/reviews/admin/:id/approve
 * Aprobar review
 */
router.put(
  '/admin/:id/approve',
  validate(reviewValidation.reviewId),
  reviewController.approveReview
);

/**
 * PUT /api/reviews/admin/:id/reject
 * Rechazar review
 */
router.put(
  '/admin/:id/reject',
  validate(reviewValidation.reviewId),
  reviewController.rejectReview
);

module.exports = router;