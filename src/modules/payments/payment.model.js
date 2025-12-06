const mongoose = require('mongoose');

/**
 * @schema paymentSchema
 * @description Esquema de pagos
 * 
 * SOURCE OF TRUTH para el módulo payments
 */
const paymentSchema = new mongoose.Schema({
  // Relaciones
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: [true, 'La orden es requerida']
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido']
  },

  // Método de pago
  paymentMethod: {
    type: String,
    required: [true, 'El método de pago es requerido'],
    enum: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery']
  },
  paymentGateway: {
    type: String,
    required: [true, 'La pasarela de pago es requerida'],
    enum: ['stripe', 'paypal', 'mercadopago', 'transfer', 'manual']
  },

  // Identificador de la pasarela
  gatewayPaymentId: {
    type: String,
    unique: true,
    sparse: true
  },

  // Montos
  amount: {
    type: Number,
    required: [true, 'El monto es requerido'],
    min: [0, 'El monto no puede ser negativo']
  },
  currency: {
    type: String,
    default: 'USD'
  },

  // Estado
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'cancelled', 'refunded'],
    default: 'pending'
  },

  // Respuesta de la pasarela
  gatewayResponse: mongoose.Schema.Types.Mixed,

  // Reembolsos
  refunds: [{
    amount: {
      type: Number,
      min: 0
    },
    reason: String,
    gatewayRefundId: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata adicional
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📌 INDEXES
paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });
paymentSchema.index({ status: 1 });
paymentSchema.index({ createdAt: -1 });

/**
 * @method markAsCompleted
 * @description Marca el pago como completado
 */
paymentSchema.methods.markAsCompleted = function() {
  this.status = 'completed';
  return this.save();
};

/**
 * @method markAsFailed
 * @description Marca el pago como fallido
 */
paymentSchema.methods.markAsFailed = function() {
  this.status = 'failed';
  return this.save();
};

/**
 * @method addRefund
 * @description Agrega un reembolso
 * 
 * @param {number} amount - Monto del reembolso
 * @param {string} reason - Razón del reembolso
 * @param {string} refundId - ID del reembolso en la pasarela
 */
paymentSchema.methods.addRefund = function(amount, reason, refundId) {
  this.refunds.push({
    amount,
    reason,
    gatewayRefundId: refundId
  });
  
  // Si el reembolso es total, cambiar estado
  const totalRefunded = this.refunds.reduce((sum, r) => sum + r.amount, 0);
  if (totalRefunded >= this.amount) {
    this.status = 'refunded';
  }
  
  return this.save();
};

module.exports = mongoose.model('Payment', paymentSchema);