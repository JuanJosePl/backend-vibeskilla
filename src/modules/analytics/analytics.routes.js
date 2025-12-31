const express = require("express");
const router = express.Router();
const analyticsController = require("./analytics.controller");
const { authMiddleware, requireRole } = require("../../middleware/auth");

/**
 * Todas las rutas requieren autenticación y rol de admin
 */
router.use(authMiddleware);
router.use(requireRole("admin", "moderator"));

/**
 * @route   GET /api/analytics/dashboard
 * @desc    Obtener dashboard general con KPIs
 * @access  Private/Admin
 */
router.get("/dashboard", analyticsController.getDashboard);

/**
 * @route   GET /api/analytics/revenue/monthly
 * @desc    Obtener ganancias mensuales
 * @access  Private/Admin
 */
router.get("/revenue/monthly", analyticsController.getMonthlyRevenue);

/**
 * @route   GET /api/analytics/products/top-selling
 * @desc    Obtener productos más vendidos
 * @access  Private/Admin
 */
router.get("/products/top-selling", analyticsController.getTopSellingProducts);

module.exports = router;