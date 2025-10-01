const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentGateway: {
    type: String,
    required: true,
    enum: ['stripe', 'paypal', 'mercadopago', 'transfer']
  },
  gatewayPaymentId: String,
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'USD'
  },
  status: {
    type: String,
    enum: [
      'pending',
      'processing', 
      'completed',
      'failed',
      'cancelled',
      'refunded'
    ],
    default: 'pending'
  },
  gatewayResponse: mongoose.Schema.Types.Mixed,
  refunds: [{
    amount: Number,
    reason: String,
    gatewayRefundId: String,
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  metadata: mongoose.Schema.Types.Mixed
}, {
  timestamps: true
});

// Índices
paymentSchema.index({ order: 1 });
paymentSchema.index({ user: 1 });
paymentSchema.index({ gatewayPaymentId: 1 });
paymentSchema.index({ status: 1 });

// ✅ CORRECCIÓN: Cambiar orderSchema por paymentSchema
module.exports = mongoose.model('Payment', paymentSchema);