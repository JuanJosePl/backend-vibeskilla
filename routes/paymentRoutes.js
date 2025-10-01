const express = require('express');
const router = express.Router();
const {
  processPayment,
  paymentWebhook
} = require('../controllers/paymentController');
const { authMiddleware } = require('../middleware/authMiddleware');

// Ruta pública para webhooks
router.post('/webhook', paymentWebhook);

// Rutas protegidas
router.post('/process', authMiddleware, processPayment);

module.exports = router;