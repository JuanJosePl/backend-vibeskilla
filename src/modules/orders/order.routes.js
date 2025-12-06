const express = require('express');
const router = express.Router();
const orderController = require('./order.controller');
const { validate, orderValidation } = require('./order.validation');
const { authMiddleware, requireRole } = require('../../middleware/auth');

// ============================================
// RUTAS DE USUARIO (requieren autenticación)
// ============================================
router.use(authMiddleware); // ✅ APLICAR AUTENTICACIÓN A TODAS LAS RUTAS

router.post('/', validate(orderValidation.createOrder), orderController.createOrder);
router.get('/', validate(orderValidation.getUserOrders), orderController.getUserOrders);
router.get('/:id', validate(orderValidation.orderId), orderController.getOrderById);
router.get('/:id/tracking', validate(orderValidation.orderId), orderController.getOrderTracking);
router.put('/:id/cancel', validate(orderValidation.orderId), orderController.cancelOrder);
router.post('/:id/return', validate(orderValidation.requestReturn), orderController.requestReturn);

// ============================================
// RUTAS ADMINISTRATIVAS
// ============================================

// ✅ CORREGIDO: No re-aplicar authMiddleware
router.get('/admin/all', requireRole('admin', 'moderator'), validate(orderValidation.getAllOrders), orderController.getAllOrders);
router.get('/admin/:id', requireRole('admin', 'moderator'), validate(orderValidation.orderId), orderController.getOrderDetails);
router.put('/admin/:id', requireRole('admin', 'moderator'), validate(orderValidation.updateOrderStatus), orderController.updateOrderStatus);
router.post('/admin/:id/refund', requireRole('admin', 'moderator'), validate(orderValidation.processRefund), orderController.processRefund);

module.exports = router;