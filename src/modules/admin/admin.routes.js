// src/modules/admin/admin.routes.js

const express = require("express");
const router = express.Router();
const adminController = require("./admin.controller");
const { validate, adminValidation } = require("./admin.validation");
const { authMiddleware, requireRole } = require("../../middleware/auth");

/**
 * @description Rutas del panel administrativo
 *
 * Todas las rutas requieren:
 * 1. authMiddleware - Usuario autenticado
 * 2. requireRole('admin', 'moderator') - Rol específico
 *
 * Estructura:
 * - /dashboard/* - Estadísticas y métricas
 * - /products/* - Gestión de productos
 * - /categories/* - Gestión de categorías
 * - /orders/* - Gestión de órdenes
 * - /users/* - Gestión de usuarios
 */

// ============================================
// MIDDLEWARE GLOBAL: Todas las rutas requieren admin/moderator
// ============================================
router.use(authMiddleware);
router.use(requireRole("admin", "moderator"));

// ============================================
// DASHBOARD - Estadísticas y métricas
// ============================================
router.get("/dashboard/stats", adminController.getDashboardStats);

router.get(
  "/dashboard/sales",
  validate(adminValidation.getSalesData),
  adminController.getSalesData
);

// ============================================
// PRODUCTOS - Gestión completa
// ============================================
router.get(
  "/products",
  validate(adminValidation.getProducts),
  adminController.getAdminProducts
);

router.get(
  "/products/low-stock",
  validate(adminValidation.getLowStock),
  adminController.getLowStockProducts
);

router.post(
  "/products",
  validate(adminValidation.createProduct),
  adminController.createAdminProduct
);

router.put(
  "/products/:id",
  validate(adminValidation.updateProduct),
  adminController.updateAdminProduct
);

router.delete(
  "/products/:id",
  validate(adminValidation.deleteProduct),
  adminController.deleteAdminProduct
);

// ============================================
// CATEGORÍAS - Gestión completa
// ============================================
router.get("/categories", adminController.getAdminCategories);

router.get("/categories/hierarchy", adminController.getCategoryHierarchy);

router.post(
  "/categories",
  validate(adminValidation.createCategory),
  adminController.createAdminCategory
);

router.put(
  "/categories/:id",
  validate(adminValidation.updateCategory),
  adminController.updateAdminCategory
);

router.delete(
  "/categories/:id",
  validate(adminValidation.deleteCategory),
  adminController.deleteAdminCategory
);

// ============================================
// ÓRDENES - Gestión completa
// ============================================
router.get(
  "/orders",
  validate(adminValidation.getOrders),
  adminController.getAdminOrders
);

router.get(
  "/orders/:id",
  validate(adminValidation.getOrderDetails),
  adminController.getAdminOrderDetails
);

router.put(
  "/orders/:id/status",
  validate(adminValidation.updateOrderStatus),
  adminController.updateOrderStatus
);

// ============================================
// USUARIOS - Gestión completa
// ============================================
router.get(
  "/users",
  validate(adminValidation.getUsers),
  adminController.getAdminUsers
);

router.get(
  "/users/:id",
  validate(adminValidation.getUserDetails),
  adminController.getAdminUserDetails
);

router.put(
  "/users/:id",
  validate(adminValidation.updateUser),
  adminController.updateAdminUser
);

router.put(
  "/users/:id/ban",
  validate(adminValidation.toggleUserBan),
  adminController.toggleUserBan
);

router.delete(
  "/users/:id",
  validate(adminValidation.deleteUser),
  adminController.deleteAdminUser
);

module.exports = router;
