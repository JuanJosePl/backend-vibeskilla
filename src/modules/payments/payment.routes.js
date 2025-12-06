const express = require('express');
const router = express.Router();
const paymentController = require('./payment.controller');
const { validate, processPaymentValidation } = require('./payment.validation');
const { authMiddleware } = require('../../middleware/auth');

/**
 * RUTA PÚBLICA - Webhooks
 */
router.post('/webhook', paymentController.paymentWebhook);

/**
 * RUTAS PROTEGIDAS
 */
router.post(
  '/process',
  authMiddleware,
  validate(processPaymentValidation),
  paymentController.processPayment
);

module.exports = router;