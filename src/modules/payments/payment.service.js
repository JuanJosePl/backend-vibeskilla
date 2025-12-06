const Payment = require('./payment.model');
const Order = require('../orders/order.model');
const ApiError = require('../../core/errors/ApiError');

/**
 * @class PaymentService
 * @description Lógica de negocio para pagos
 */
class PaymentService {
  /**
   * Procesar pago
   * 
   * @param {string} userId - ID del usuario
   * @param {Object} paymentData - Datos del pago
   * @returns {Promise<Object>} Pago procesado
   */
  async processPayment(userId, paymentData) {
    const { orderId, paymentMethod, paymentData: gatewayData } = paymentData;

    // Verificar orden
    const order = await Order.findOne({ _id: orderId, user: userId });
    if (!order) {
      throw ApiError.notFound('Orden no encontrada');
    }

    if (order.paymentStatus === 'paid') {
      throw ApiError.badRequest('La orden ya ha sido pagada');
    }

    // Determinar gateway según método de pago
    const gateway = this._getGatewayForMethod(paymentMethod);

    // TODO: Integración real con pasarelas de pago
    // Simulación de procesamiento
    const paymentResult = await this._processWithGateway(gateway, {
      amount: order.totalAmount,
      currency: 'USD',
      orderId: order._id,
      ...gatewayData
    });

    if (paymentResult.success) {
      // Crear registro de pago
      const payment = await Payment.create({
        order: order._id,
        user: userId,
        paymentMethod,
        paymentGateway: gateway,
        gatewayPaymentId: paymentResult.gatewayPaymentId,
        amount: order.totalAmount,
        status: 'completed',
        gatewayResponse: paymentResult
      });

      // Actualizar orden
      await order.markAsPaid();

      return {
        payment,
        order
      };
    } else {
      // Crear registro de pago fallido
      await Payment.create({
        order: order._id,
        user: userId,
        paymentMethod,
        paymentGateway: gateway,
        amount: order.totalAmount,
        status: 'failed',
        gatewayResponse: paymentResult
      });

      throw ApiError.badRequest('El pago falló. Por favor, intenta nuevamente.');
    }
  }

  /**
   * Procesar webhook de pasarela de pago
   * 
   * @param {Object} webhookData - Datos del webhook
   */
  async processWebhook(webhookData) {
    const { type, data } = webhookData;

    switch (type) {
      case 'payment.succeeded':
        await this._handlePaymentSuccess(data);
        break;

      case 'payment.failed':
        await this._handlePaymentFailure(data);
        break;

      case 'payment.refunded':
        await this._handlePaymentRefund(data);
        break;

      default:
        console.log('Webhook no manejado:', type);
    }
  }

  /**
   * Obtener gateway según método de pago
   * 
   * @private
   */
  _getGatewayForMethod(method) {
    const gatewayMap = {
      credit_card: 'stripe',
      debit_card: 'stripe',
      paypal: 'paypal',
      bank_transfer: 'manual',
      cash_on_delivery: 'manual'
    };
    return gatewayMap[method] || 'manual';
  }

  /**
   * Simular procesamiento con gateway
   * 
   * @private
   */
  async _processWithGateway(gateway, data) {
    // TODO: Implementar integración real
    // Simulación
    return {
      success: true,
      gatewayPaymentId: `${gateway}_${Date.now()}`,
      status: 'completed',
      message: 'Pago procesado exitosamente'
    };
  }

  /**
   * Manejar pago exitoso
   * 
   * @private
   */
  async _handlePaymentSuccess(data) {
    const payment = await Payment.findOne({ gatewayPaymentId: data.id });
    if (payment) {
      await payment.markAsCompleted();
      
      const order = await Order.findById(payment.order);
      if (order) {
        await order.markAsPaid();
      }
    }
  }

  /**
   * Manejar pago fallido
   * 
   * @private
   */
  async _handlePaymentFailure(data) {
    const payment = await Payment.findOne({ gatewayPaymentId: data.id });
    if (payment) {
      await payment.markAsFailed();
    }
  }

  /**
   * Manejar reembolso
   * 
   * @private
   */
  async _handlePaymentRefund(data) {
    const payment = await Payment.findOne({ gatewayPaymentId: data.id });
    if (payment) {
      await payment.addRefund(data.amount, data.reason, data.refundId);
    }
  }
}

module.exports = new PaymentService();