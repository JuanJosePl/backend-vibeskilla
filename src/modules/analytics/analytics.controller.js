const analyticsService = require('./analytics.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class AnalyticsController
 * @description Controlador ultra delgado para ANALYTICS
 */

/**
 * @desc    Obtener dashboard general
 * @route   GET /api/analytics/dashboard
 * @access  Private/Admin
 */
const getDashboard = catchAsync(async (req, res) => {
  const { period, startDate, endDate } = req.query;
  
  const dashboard = await analyticsService.getDashboard({
    period,
    startDate,
    endDate
  });

  res.json({
    success: true,
    data: dashboard
  });
});

/**
 * @desc    Obtener ganancias mensuales
 * @route   GET /api/analytics/revenue/monthly
 * @access  Private/Admin
 */
const getMonthlyRevenue = catchAsync(async (req, res) => {
  const { months = 12 } = req.query;
  
  const revenue = await analyticsService.getMonthlyRevenue(parseInt(months));

  res.json({
    success: true,
    data: revenue
  });
});

/**
 * @desc    Obtener productos más vendidos
 * @route   GET /api/analytics/products/top-selling
 * @access  Private/Admin
 */
const getTopSellingProducts = catchAsync(async (req, res) => {
  const { limit = 20, period, startDate, endDate } = req.query;
  
  const products = await analyticsService.getTopSellingProducts(
    parseInt(limit),
    { period, startDate, endDate }
  );

  res.json({
    success: true,
    count: products.length,
    data: products
  });
});

module.exports = {
  getDashboard,
  getMonthlyRevenue,
  getTopSellingProducts
};