const Order = require('../models/Order');
const Payment = require('../models/Payment');

// @desc    Procesar pago
// @route   POST /api/payments/process
// @access  Private
const processPayment = async (req, res) => {
  try {
    const { orderId, paymentMethod, paymentData } = req.body;

    const order = await Order.findOne({
      _id: orderId,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (order.paymentStatus === 'paid') {
      return res.status(400).json({
        success: false,
        message: 'La orden ya ha sido pagada'
      });
    }

    // Simulación de procesamiento de pago
    // En producción integrarías con Stripe, PayPal, etc.
    const paymentResult = {
      success: true,
      gatewayPaymentId: 'pay_' + Date.now(),
      status: 'completed'
    };

    if (paymentResult.success) {
      // Actualizar orden
      order.paymentStatus = 'paid';
      order.paymentMethod = paymentMethod;
      order.paymentId = paymentResult.gatewayPaymentId;
      order.paidAt = new Date();
      order.status = 'confirmed';

      await order.processOrder();

      // Crear registro de pago
      const payment = await Payment.create({
        order: order._id,
        user: req.user._id,
        paymentMethod,
        paymentGateway: 'stripe', // Ejemplo
        gatewayPaymentId: paymentResult.gatewayPaymentId,
        amount: order.totalAmount,
        status: 'completed',
        gatewayResponse: paymentResult
      });

      res.json({
        success: true,
        message: 'Pago procesado exitosamente',
        data: {
          order,
          payment
        }
      });
    } else {
      order.paymentStatus = 'failed';
      await order.save();

      res.status(400).json({
        success: false,
        message: 'El pago falló'
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al procesar pago',
      error: error.message
    });
  }
};

// @desc    Webhook para pagos
// @route   POST /api/payments/webhook
// @access  Public
const paymentWebhook = async (req, res) => {
  try {
    const { type, data } = req.body;

    // Procesar webhook según el tipo de evento
    switch (type) {
      case 'payment.succeeded':
        // Actualizar orden como pagada
        const paymentIntent = data.object;
        const order = await Order.findOne({ paymentId: paymentIntent.id });
        
        if (order) {
          order.paymentStatus = 'paid';
          order.paidAt = new Date();
          order.status = 'confirmed';
          await order.processOrder();
        }
        break;

      case 'payment.failed':
        // Marcar pago como fallido
        const failedPayment = data.object;
        const failedOrder = await Order.findOne({ paymentId: failedPayment.id });
        
        if (failedOrder) {
          failedOrder.paymentStatus = 'failed';
          await failedOrder.save();
        }
        break;
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({
      success: false,
      message: 'Webhook error'
    });
  }
};

module.exports = {
  processPayment,
  paymentWebhook
};