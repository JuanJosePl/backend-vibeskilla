const mongoose = require('mongoose');

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
    required: true
  },
  sku: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  attributes: {
    size: String,
    color: String,
    material: String
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
  items: [orderItemSchema],
  
  // Totales
  subtotal: {
    type: Number,
    required: true,
    min: 0
  },
  shippingCost: {
    type: Number,
    required: true,
    min: 0
  },
  taxAmount: {
    type: Number,
    required: true,
    min: 0
  },
  discountAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  
  // Direcciones
  shippingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  billingAddress: {
    firstName: String,
    lastName: String,
    street: String,
    city: String,
    state: String,
    zipCode: String,
    country: String,
    phone: String
  },
  
  // Envío
  shippingMethod: {
    type: String,
    required: true
  },
  trackingNumber: String,
  estimatedDelivery: Date,
  
  // Pago
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'failed', 'refunded', 'partially_refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    required: true
  },
  paymentId: String, // ID de la pasarela de pago
  paidAt: Date,
  
  // Estado
  status: {
    type: String,
    enum: [
      'pending',
      'confirmed', 
      'processing',
      'shipped',
      'delivered',
      'cancelled',
      'refunded'
    ],
    default: 'pending'
  },
  
  // Notas
  customerNotes: String,
  adminNotes: String,
  
  // Cupón
  coupon: {
    code: String,
    discount: Number,
    type: String
  }
}, {
  timestamps: true
});

// Generar número de orden antes de guardar
orderSchema.pre('save', async function(next) {
  if (this.isNew) {
    const count = await mongoose.model('Order').countDocuments();
    this.orderNumber = `ORD-${Date.now()}-${count + 1}`;
  }
  next();
});

// Método para procesar orden
orderSchema.methods.processOrder = async function() {
  const Product = mongoose.model('Product');
  
  // Verificar stock y reservar productos
  for (let item of this.items) {
    const product = await Product.findById(item.product);
    
    if (!product) {
      throw new Error(`Producto no encontrado: ${item.productName}`);
    }
    
    if (product.trackQuantity && product.stock < item.quantity) {
      throw new Error(`Stock insuficiente para: ${item.productName}`);
    }
    
    // Reducir stock
    if (product.trackQuantity) {
      await product.reduceStock(item.quantity);
    }
  }
  
  this.status = 'confirmed';
  return this.save();
};

// Método para cancelar orden
orderSchema.methods.cancelOrder = async function() {
  if (this.status === 'delivered') {
    throw new Error('No se puede cancelar una orden ya entregada');
  }
  
  const Product = mongoose.model('Product');
  
  // Restaurar stock
  for (let item of this.items) {
    const product = await Product.findById(item.product);
    if (product && product.trackQuantity) {
      product.stock += item.quantity;
      await product.save();
    }
  }
  
  this.status = 'cancelled';
  return this.save();
};

// Índices
orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ paymentStatus: 1 });
orderSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Order', orderSchema);