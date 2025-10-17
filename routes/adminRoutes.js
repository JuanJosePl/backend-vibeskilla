const express = require('express');
const router = express.Router();
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Import controllers
const {
  getDashboardStats,
  getSalesData,
  getAdminProducts,
  createAdminProduct,
  updateAdminProduct,
  deleteAdminProduct,
  getAdminCategories,
  createAdminCategory,
  updateAdminCategory,
  deleteAdminCategory,
  getAdminOrders,
  updateOrderStatus,
  getAdminOrderDetails,
  getAdminUsers,
  updateAdminUser,
  deleteAdminUser
} = require('../controllers/adminController');

// All routes require admin role
router.use(authMiddleware);
router.use(requireRole(['admin', 'moderator']));

// Dashboard
router.get('/dashboard/stats', getDashboardStats);
router.get('/dashboard/sales', getSalesData);

// Products
router.get('/products', getAdminProducts);
router.post('/products', createAdminProduct);
router.put('/products/:id', updateAdminProduct);
router.delete('/products/:id', deleteAdminProduct);

// Categories
router.get('/categories', getAdminCategories);
router.post('/categories', createAdminCategory);
router.put('/categories/:id', updateAdminCategory);
router.delete('/categories/:id', deleteAdminCategory);

// Orders
router.get('/orders', getAdminOrders);
router.get('/orders/:id', getAdminOrderDetails);
router.put('/orders/:id/status', updateOrderStatus);

// Users
router.get('/users', getAdminUsers);
router.put('/users/:id', updateAdminUser);
router.delete('/users/:id', deleteAdminUser);

module.exports = router;