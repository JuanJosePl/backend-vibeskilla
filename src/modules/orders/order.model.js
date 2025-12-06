// src/modules/orders/order.model.js

const mongoose = require('mongoose');
const crypto = require('crypto');

/**
 * @schema orderItemSchema
 * @description Item individual de una orden (snapshot inmutable del producto)
 * 
 * Es un VALUE OBJECT en DDD - No tiene identidad propia, es parte del agregado Order
 */
const orderItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  
  productName: {
    type: String,
    required: true
  },
  
  productImage: {
    type: String,
    default: ''
  },
  
  sku: {
    type: String,
    required: true
  },
  
  quantity: {
    type: Number,
    required: true,
    min: [1, 'La cantidad mínima es 1']
  },
  
  unitPrice: {
    type: Number,
    required: true,
    min: [0, 'El precio no puede ser negativo']
  },
  
  // Atributos del producto al momento de la compra
  attributes: {
    size: String,
    color: String,
    material: String
  },
  
  variant: {
    type: mongoose.Schema.Types.ObjectId
  }
  
}, { _id: false });

/**
 * @schema addressSchema
 * @description VALUE OBJECT para direcciones de envío/facturación
 */
const addressSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  
  street: {
    type: String,
    required: true
  },
  
  city: {
    type: String,
    required: true
  },
  
  state: {
    type: String,
    required: true
  },
  
  zipCode: {
    type: String,
    required: true
  },
  
  country: {
    type: String,
    required: true,
    default: 'Colombia'
  },
  
  phone: {
    type: String,
    required: true
  }
  
}, { _id: false });

/**
 * @schema orderSchema
 * @description AGREGADO RAÍZ del dominio ORDER
 * 
 * SOURCE OF TRUTH para el módulo orders
 * 
 * Responsabilidades:
 * - Snapshot completo de la transacción
 * - Gestión de estados (order status + payment status)
 * - Historial de fulfillment
 * - Cálculos de totales
 * 
 * Reglas de dominio:
 * 1. Items son inmutables (snapshot)
 * 2. Solo se puede cancelar si status = pending/confirmed
 * 3. Trackingumber solo si status = shipped
 * 4. paymentStatus debe ser 'paid' para procesar
 */
const orderSchema = new mongoose.Schema({
  
  // Identificador público (ORDER-XXXXX)
  orderNumber: {
    type: String,
    unique: true,
    uppercase: true
  },
  
  // Relación con usuario
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  
  // Snapshot de información del cliente
  customerInfo: {
    email: {
      type: String,
      required: true
    },
    firstName: {
      type: String,
      required: true
    },
    lastName: {
      type: String,
      required: true
    },
    phone: String
  },
  
  // Items de la orden (SNAPSHOT INMUTABLE)
  items: {
    type: [orderItemSchema],
    validate: {
      validator: function(items) {
        return items && items.length > 0;
      },
      message: 'La orden debe tener al menos un item'
    }
  },
  
  // Montos (calculados y persistidos)
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  
  shippingCost: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  taxAmount: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  
  discountAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  refundAmount: {
    type: Number,
    min: 0,
    default: 0
  },
  
  // Direcciones (SNAPSHOT)
  shippingAddress: {
    type: addressSchema,
    required: true
  },
  
  billingAddress: addressSchema,
  
  // Métodos
  shippingMethod: {
    type: String,
    default: 'standard'
  },
  
  paymentMethod: {
    type: String,
    required: true,
    enum: {
      values: ['credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery'],
      message: 'Método de pago inválido'
    }
  },
  
  // Estados (máquina de estados)
  status: {
    type: String,
    enum: {
      values: ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
      message: 'Estado de orden inválido'
    },
    default: 'pending',
    index: true
  },
  
  paymentStatus: {
    type: String,
    enum: {
      values: ['pending', 'paid', 'failed', 'refunded'],
      message: 'Estado de pago inválido'
    },
    default: 'pending',
    index: true
  },
  
  // Fulfillment
  trackingNumber: String,
  
  // Notas
  customerNotes: String,
  adminNotes: String,
  
  // Cupón aplicado (SNAPSHOT)
  coupon: {
    code: String,
    discount: Number,
    type: String
  },
  
  // Auditoría de eventos
  paidAt: Date,
  shippedAt: Date,
  deliveredAt: Date,
  cancelledAt: Date,
  refundedAt: Date
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// ÍNDICES
// ============================================
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 }, { unique: true });
orderSchema.index({ status: 1, paymentStatus: 1 });
orderSchema.index({ 'customerInfo.email': 1 });
orderSchema.index({ createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * @virtual itemsCount
 * @description Cuenta total de items en la orden
 */
orderSchema.virtual('itemsCount').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

/**
 * @virtual totalRefundable
 * @description Monto máximo que se puede reembolsar
 */
orderSchema.virtual('totalRefundable').get(function() {
  return this.totalAmount - this.refundAmount;
});

/**
 * @virtual canBeCancelled
 * @description Verifica si la orden puede ser cancelada
 */
orderSchema.virtual('canBeCancelled').get(function() {
  return ['pending', 'confirmed'].includes(this.status) && this.paymentStatus !== 'refunded';
});

/**
 * @virtual canBeRefunded
 * @description Verifica si la orden puede ser reembolsada
 */
orderSchema.virtual('canBeRefunded').get(function() {
  return this.paymentStatus === 'paid' && this.refundAmount < this.totalAmount;
});

// ============================================
// MIDDLEWARE PRE-SAVE
// ============================================

/**
 * Generar orderNumber automático antes de guardar
 */
orderSchema.pre('save', function(next) {
  if (!this.orderNumber) {
    // Formato: ORDER-TIMESTAMP-RANDOM
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(2).toString('hex').toUpperCase();
    this.orderNumber = `ORDER-${timestamp}-${random}`;
  }
  next();
});

/**
 * Validar consistencia de estados antes de guardar
 */
orderSchema.pre('save', function(next) {
  // Si está cancelada, no puede estar en fulfilled
  if (this.status === 'cancelled' && ['shipped', 'delivered'].includes(this.status)) {
    return next(new Error('Una orden cancelada no puede estar enviada o entregada'));
  }
  
  // Si está shipped, debe tener tracking
  if (this.status === 'shipped' && !this.trackingNumber) {
    return next(new Error('Una orden enviada debe tener número de tracking'));
  }
  
  next();
});

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

/**
 * @method cancelOrder
 * @description Cancela la orden si es posible
 * 
 * Reglas:
 * - Solo se puede cancelar si status = pending/confirmed
 * - No se puede cancelar si ya está paid (requiere refund)
 * 
 * @returns {Promise<Order>}
 */
orderSchema.methods.cancelOrder = async function() {
  if (!['pending', 'confirmed'].includes(this.status)) {
    throw new Error('No se puede cancelar la orden en su estado actual');
  }
  
  if (this.paymentStatus === 'paid') {
    throw new Error('No se puede cancelar una orden pagada. Debe solicitar reembolso.');
  }
  
  this.status = 'cancelled';
  this.cancelledAt = new Date();
  
  return this.save();
};

/**
 * @method markAsPaid
 * @description Marca la orden como pagada
 * @returns {Promise<Order>}
 */
orderSchema.methods.markAsPaid = function() {
  this.paymentStatus = 'paid';
  this.paidAt = new Date();
  
  if (this.status === 'pending') {
    this.status = 'confirmed';
  }
  
  return this.save();
};

/**
 * @method markAsShipped
 * @description Marca la orden como enviada
 * 
 * @param {string} trackingNumber - Número de seguimiento
 * @returns {Promise<Order>}
 */
orderSchema.methods.markAsShipped = function(trackingNumber) {
  if (!trackingNumber) {
    throw new Error('Se requiere número de tracking para marcar como enviada');
  }
  
  if (this.paymentStatus !== 'paid') {
    throw new Error('Solo se pueden enviar órdenes pagadas');
  }
  
  this.status = 'shipped';
  this.shippedAt = new Date();
  this.trackingNumber = trackingNumber;
  
  return this.save();
};

/**
 * @method markAsDelivered
 * @description Marca la orden como entregada
 * @returns {Promise<Order>}
 */
orderSchema.methods.markAsDelivered = function() {
  if (this.status !== 'shipped') {
    throw new Error('Solo se pueden entregar órdenes que están enviadas');
  }
  
  this.status = 'delivered';
  this.deliveredAt = new Date();
  
  return this.save();
};

/**
 * @method processRefund
 * @description Procesa un reembolso parcial o total
 * 
 * @param {number} amount - Monto a reembolsar
 * @returns {Promise<Order>}
 */
orderSchema.methods.processRefund = function(amount) {
  if (this.paymentStatus !== 'paid') {
    throw new Error('Solo se pueden reembolsar órdenes pagadas');
  }
  
  const maxRefund = this.totalAmount - this.refundAmount;
  
  if (amount > maxRefund) {
    throw new Error(`El monto máximo a reembolsar es ${maxRefund}`);
  }
  
  this.refundAmount += amount;
  
  // Si se reembolsa todo, marcar como refunded
  if (this.refundAmount >= this.totalAmount) {
    this.paymentStatus = 'refunded';
    this.refundedAt = new Date();
  }
  
  return this.save();
};

/**
 * @method calculateTotals
 * @description Calcula y valida totales de la orden
 * @returns {Object} Desglose de totales
 */
orderSchema.methods.calculateTotals = function() {
  const itemsTotal = this.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice);
  }, 0);
  
  const finalTotal = itemsTotal + this.shippingCost + this.taxAmount - this.discountAmount;
  
  return {
    itemsTotal,
    shipping: this.shippingCost,
    tax: this.taxAmount,
    discount: this.discountAmount,
    total: finalTotal
  };
};

module.exports = mongoose.model('Order', orderSchema);