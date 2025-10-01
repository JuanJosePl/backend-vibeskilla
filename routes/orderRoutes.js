const express = require('express');
const router = express.Router();
const {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
} = require('../controllers/orderController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Rutas de usuario
router.use(authMiddleware);

router.post('/', createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);
router.put('/:id/cancel', cancelOrder);

// Rutas de administrador
router.get('/admin/all', requireRole(['admin']), getAllOrders);
router.put('/admin/:id', requireRole(['admin']), updateOrderStatus);

module.exports = router;