// src/modules/reviews/review.controller.js

const reviewService = require('./review.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class ReviewController
 * @description Controlador ultra delgado para REVIEWS
 * 
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Delegar a reviewService
 * - Formatear respuestas
 * 
 * Patrones aplicados:
 * - MVC Pattern (Controller)
 * - Thin Controller Pattern
 * - Delegation Pattern
 */

/** 
 * ==========================================
 * RUTAS PÚBLICAS
 * ==========================================
 */

/**
 * @desc    Obtener reviews de un producto
 * @route   GET /api/reviews/products/:productId
 * @access  Public
 */
const getProductReviews = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const result = await reviewService.getProductReviews(productId, req.query);
  
  res.json({
    success: true,
    count: result.reviews.length,
    data: result.reviews,
    pagination: result.pagination
  });
});

/**
 * @desc    Obtener estadísticas de reviews
 * @route   GET /api/reviews/products/:productId/stats
 * @access  Public
 */
const getReviewStats = catchAsync(async (req, res) => {
  const stats = await reviewService.getReviewStats(req.params.productId);
  
  res.json({
    success: true,
    data: stats
  });
});

/** 
 * ==========================================
 * RUTAS PROTEGIDAS (Usuario autenticado)
 * ==========================================
 */

/**
 * @desc    Crear review
 * @route   POST /api/reviews/products/:productId
 * @access  Private
 */
const createReview = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const review = await reviewService.createReview(productId, req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Review creada exitosamente',
    data: review
  });
});

/**
 * @desc    Actualizar review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
const updateReview = catchAsync(async (req, res) => {
  const review = await reviewService.updateReview(req.params.id, req.user._id, req.body);
  
  res.json({
    success: true,
    message: 'Review actualizada exitosamente',
    data: review
  });
});

/**
 * @desc    Eliminar review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
const deleteReview = catchAsync(async (req, res) => {
  await reviewService.deleteReview(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Review eliminada exitosamente'
  });
});

/**
 * @desc    Marcar review como útil
 * @route   POST /api/reviews/:id/helpful
 * @access  Private
 */
const markAsHelpful = catchAsync(async (req, res) => {
  await reviewService.markAsHelpful(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Marcado como útil'
  });
});

/**
 * @desc    Reportar review
 * @route   POST /api/reviews/:id/report
 * @access  Private
 */
const reportReview = catchAsync(async (req, res) => {
  await reviewService.reportReview(req.params.id, req.user._id, req.body.reason);
  
  res.json({
    success: true,
    message: 'Review reportada exitosamente'
  });
});

/** 
 * ==========================================
 * RUTAS ADMINISTRATIVAS
 * ==========================================
 */

/**
 * @desc    Obtener reviews pendientes de moderación (Admin)
 * @route   GET /api/reviews/admin/pending
 * @access  Private/Admin
 */
const getPendingReviews = catchAsync(async (req, res) => {
  const result = await reviewService.getPendingReviews(req.query);
  
  res.json({
    success: true,
    data: result.reviews,
    pagination: result.pagination
  });
});

/**
 * @desc    Aprobar review (Admin)
 * @route   PUT /api/reviews/admin/:id/approve
 * @access  Private/Admin
 */
const approveReview = catchAsync(async (req, res) => {
  await reviewService.approveReview(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Review aprobada exitosamente'
  });
});

/**
 * @desc    Rechazar review (Admin)
 * @route   PUT /api/reviews/admin/:id/reject
 * @access  Private/Admin
 */
const rejectReview = catchAsync(async (req, res) => {
  await reviewService.rejectReview(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Review rechazada exitosamente'
  });
});

module.exports = {
  // Públicas
  getProductReviews,
  getReviewStats,
  
  // Protegidas (usuario)
  createReview,
  updateReview,
  deleteReview,
  markAsHelpful,
  reportReview,
  
  // Admin
  getPendingReviews,
  approveReview,
  rejectReview
};