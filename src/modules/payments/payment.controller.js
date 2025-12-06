const paymentService = require('./payment.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @desc    Procesar pago
 * @route   POST /api/payments/process
 * @access  Private
 */
const processPayment = catchAsync(async (req, res) => {
  const result = await paymentService.processPayment(req.user._id, req.body);

  res.json({
    success: true,
    message: 'Pago procesado exitosamente',
    data: result
  });
});

/**
 * @desc    Webhook para pagos
 * @route   POST /api/payments/webhook
 * @access  Public
 */
const paymentWebhook = catchAsync(async (req, res) => {
  await paymentService.processWebhook(req.body);

  res.json({ 
    success: true,
    received: true 
  });
});

module.exports = {
  processPayment,
  paymentWebhook
};