const activityService = require('./activity.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class UserActivityController
 * @description Controlador ultra delgado para USER ACTIVITY
 */

/**
 * @desc    Registrar actividad
 * @route   POST /api/activity
 * @access  Public/Private
 */
const logActivity = catchAsync(async (req, res) => {
  const activity = await activityService.logActivity({
    ...req.body,
    userId: req.user?._id,
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
    referrer: req.headers.referer
  });

  res.status(201).json({
    success: true,
    data: activity
  });
});

/**
 * @desc    Obtener actividad reciente
 * @route   GET /api/activity/recent
 * @access  Private
 */
const getRecentActivity = catchAsync(async (req, res) => {
  const { limit } = req.query;
  
  const activity = await activityService.getRecentActivity(req.user._id, parseInt(limit));

  res.json({
    success: true,
    data: activity
  });
});

/**
 * @desc    Obtener productos vistos
 * @route   GET /api/activity/products/viewed
 * @access  Private
 */
const getProductViews = catchAsync(async (req, res) => {
  const { days } = req.query;
  
  const views = await activityService.getProductViews(req.user._id, parseInt(days));

  res.json({
    success: true,
    data: views
  });
});

/**
 * @desc    Obtener estadísticas de actividad
 * @route   GET /api/activity/stats
 * @access  Private
 */
const getUserStats = catchAsync(async (req, res) => {
  const { days } = req.query;
  
  const stats = await activityService.getUserStats(req.user._id, parseInt(days));

  res.json({
    success: true,
    data: stats
  });
});

/**
 * @desc    Obtener patrón de comportamiento
 * @route   GET /api/activity/behavior
 * @access  Private
 */
const getBehaviorPattern = catchAsync(async (req, res) => {
  const pattern = await activityService.getUserBehaviorPattern(req.user._id);

  res.json({
    success: true,
    data: pattern
  });
});

/**
 * @desc    Obtener carritos abandonados (Admin)
 * @route   GET /api/activity/abandoned-carts
 * @access  Private/Admin
 */
const getAbandonedCarts = catchAsync(async (req, res) => {
  const { hours = 24 } = req.query;
  
  const abandoned = await activityService.getAbandonedCarts(parseInt(hours));

  res.json({
    success: true,
    count: abandoned.length,
    data: abandoned
  });
});

module.exports = {
  logActivity,
  getRecentActivity,
  getProductViews,
  getUserStats,
  getBehaviorPattern,
  getAbandonedCarts
};