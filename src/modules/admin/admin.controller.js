// src/modules/admin/admin.controller.js

const adminService = require("./admin.service");
const productService = require("../products/product.service");
const categoryService = require("../categories/category.service");
const orderService = require("../orders/order.service");
const catchAsync = require("../../core/utils/catchAsync");

/**
 * @class AdminController
 * @description Controlador ultra delgado para panel administrativo
 *
 * Responsabilidades:
 * - Recibir requests HTTP
 * - Validar entrada básica
 * - Delegar a servicios
 * - Formatear respuestas
 *
 * Patrones aplicados:
 * - MVC Pattern (Controller)
 * - Delegation Pattern
 * - Thin Controller Pattern
 */

/**
 * ==========================================
 * DASHBOARD - Estadísticas y métricas
 * ==========================================
 */

/**
 * @desc    Obtener estadísticas del dashboard
 * @route   GET /api/admin/dashboard/stats
 * @access  Private/Admin
 */
const getDashboardStats = catchAsync(async (req, res) => {
  const stats = await adminService.getDashboardStats();

  res.json({
    success: true,
    data: stats,
  });
});

/**
 * @desc    Obtener datos de ventas para gráficos
 * @route   GET /api/admin/dashboard/sales
 * @access  Private/Admin
 */
const getSalesData = catchAsync(async (req, res) => {
  const { range = "monthly" } = req.query;
  const salesData = await adminService.getSalesData(range);

  res.json({
    success: true,
    data: salesData,
  });
});

/**
 * ==========================================
 * PRODUCTOS - Gestión completa
 * ==========================================
 */

/**
 * @desc    Obtener todos los productos (Admin)
 * @route   GET /api/admin/products
 * @access  Private/Admin
 */
const getAdminProducts = catchAsync(async (req, res) => {
  const result = await productService.getProducts({
    ...req.query,
    includeInactive: true, // Admin puede ver productos inactivos
  });

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

/**
 * @desc    Crear producto
 * @route   POST /api/admin/products
 * @access  Private/Admin
 */
const createAdminProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct({
    ...req.body,
    createdBy: req.user._id, // Auditoría
  });

  res.status(201).json({
    success: true,
    message: "Producto creado exitosamente",
    data: product,
  });
});

/**
 * @desc    Actualizar producto
 * @route   PUT /api/admin/products/:id
 * @access  Private/Admin
 */
const updateAdminProduct = catchAsync(async (req, res) => {
  const product = await productService.updateProduct(req.params.id, {
    ...req.body,
    updatedBy: req.user._id, // Auditoría
  });

  res.json({
    success: true,
    message: "Producto actualizado exitosamente",
    data: product,
  });
});

/**
 * @desc    Archivar producto (soft delete)
 * @route   DELETE /api/admin/products/:id
 * @access  Private/Admin
 */
const deleteAdminProduct = catchAsync(async (req, res) => {
  await productService.deleteProduct(req.params.id);

  res.json({
    success: true,
    message: "Producto archivado exitosamente",
  });
});

/**
 * @desc    Obtener productos con stock bajo
 * @route   GET /api/admin/products/low-stock
 * @access  Private/Admin
 */
const getLowStockProducts = catchAsync(async (req, res) => {
  const { threshold = 10 } = req.query;
  const products = await productService.getLowStockProducts(
    parseInt(threshold)
  );

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

/**
 * ==========================================
 * CATEGORÍAS - Gestión completa
 * ==========================================
 */

/**
 * @desc    Obtener todas las categorías (Admin)
 * @route   GET /api/admin/categories
 * @access  Private/Admin
 */
const getAdminCategories = catchAsync(async (req, res) => {
  const categories = await categoryService.getCategories({
    includeInactive: true, // Admin ve todo
  });

  res.json({
    success: true,
    data: categories,
  });
});

/**
 * @desc    Obtener jerarquía de categorías (Admin)
 * @route   GET /api/admin/categories/hierarchy
 * @access  Private/Admin
 */
const getCategoryHierarchy = catchAsync(async (req, res) => {
  const tree = await categoryService.getCategoryTree();

  res.json({
    success: true,
    data: tree,
  });
});

/**
 * @desc    Crear categoría
 * @route   POST /api/admin/categories
 * @access  Private/Admin
 */
const createAdminCategory = catchAsync(async (req, res) => {
  const category = await categoryService.createCategory({
    ...req.body,
    createdBy: req.user._id,
  });

  res.status(201).json({
    success: true,
    message: "Categoría creada exitosamente",
    data: category,
  });
});

/**
 * @desc    Actualizar categoría
 * @route   PUT /api/admin/categories/:id
 * @access  Private/Admin
 */
const updateAdminCategory = catchAsync(async (req, res) => {
  const category = await categoryService.updateCategory(req.params.id, {
    ...req.body,
    updatedBy: req.user._id,
  });

  res.json({
    success: true,
    message: "Categoría actualizada exitosamente",
    data: category,
  });
});

/**
 * @desc    Archivar categoría (soft delete)
 * @route   DELETE /api/admin/categories/:id
 * @access  Private/Admin
 */
const deleteAdminCategory = catchAsync(async (req, res) => {
  await categoryService.deleteCategory(req.params.id);

  res.json({
    success: true,
    message: "Categoría eliminada exitosamente",
  });
});

/**
 * ==========================================
 * ÓRDENES - Gestión completa
 * ==========================================
 */

/**
 * @desc    Obtener todas las órdenes (Admin)
 * @route   GET /api/admin/orders
 * @access  Private/Admin
 */
const getAdminOrders = catchAsync(async (req, res) => {
  const result = await orderService.getAllOrders(req.query);

  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination,
  });
});

/**
 * @desc    Obtener detalles de orden (Admin)
 * @route   GET /api/admin/orders/:id
 * @access  Private/Admin
 */
const getAdminOrderDetails = catchAsync(async (req, res) => {
  const order = await orderService.getOrderDetails(req.params.id);

  res.json({
    success: true,
    data: order,
  });
});

/**
 * @desc    Actualizar estado de orden
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private/Admin
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, {
    ...req.body,
    updatedBy: req.user._id,
  });

  res.json({
    success: true,
    message: "Orden actualizada exitosamente",
    data: order,
  });
});

/**
 * ==========================================
 * USUARIOS - Gestión completa
 * ==========================================
 */

/**
 * @desc    Obtener todos los usuarios (Admin)
 * @route   GET /api/admin/users
 * @access  Private/Admin
 */
const getAdminUsers = catchAsync(async (req, res) => {
  // ✅ DELEGAMOS al servicio (antes estaba en el controlador)
  const result = await adminService.getUsers(req.query);

  res.json({
    success: true,
    data: result.users,
    pagination: result.pagination,
  });
});

/**
 * @desc    Obtener detalles de usuario (Admin)
 * @route   GET /api/admin/users/:id
 * @access  Private/Admin
 */
const getAdminUserDetails = catchAsync(async (req, res) => {
  const user = await adminService.getUserDetails(req.params.id);

  res.json({
    success: true,
    data: user,
  });
});

/**
 * @desc    Actualizar usuario (Admin)
 * @route   PUT /api/admin/users/:id
 * @access  Private/Admin
 */
const updateAdminUser = catchAsync(async (req, res) => {
  const user = await adminService.updateUser(req.params.id, {
    ...req.body,
    updatedBy: req.user._id,
  });

  res.json({
    success: true,
    message: "Usuario actualizado exitosamente",
    data: user,
  });
});

/**
 * @desc    Eliminar usuario (Admin) - Hard delete solo para admin
 * @route   DELETE /api/admin/users/:id
 * @access  Private/Admin
 */
const deleteAdminUser = catchAsync(async (req, res) => {
  await adminService.deleteUser(req.params.id);

  res.json({
    success: true,
    message: "Usuario eliminado exitosamente",
  });
});

/**
 * @desc    Banear/Desbanear usuario
 * @route   PUT /api/admin/users/:id/ban
 * @access  Private/Admin
 */
const toggleUserBan = catchAsync(async (req, res) => {
  const { isBanned, reason } = req.body;
  const user = await adminService.toggleUserBan(
    req.params.id,
    isBanned,
    reason
  );

  res.json({
    success: true,
    message: isBanned
      ? "Usuario baneado exitosamente"
      : "Usuario desbaneado exitosamente",
    data: user,
  });
});

module.exports = {
  // Dashboard
  getDashboardStats,
  getSalesData,

  // Productos
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getLowStockProducts,

  // Categorías
  getAdminCategories,
  getCategoryHierarchy,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,

  // Órdenes
  getAdminOrders,
  getAdminOrderDetails,
  updateOrderStatus,

  // Usuarios
  getAdminUsers,
  getAdminUserDetails,
  updateAdminUser,
  deleteAdminUser,
  toggleUserBan,
};
