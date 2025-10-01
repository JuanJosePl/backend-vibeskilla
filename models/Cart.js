const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  variant: {
    type: mongoose.Schema.Types.ObjectId
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1
  },
  price: {
    type: Number,
    required: true,
    min: 0
  },
  attributes: {
    size: String,
    color: String,
    material: String
  }
});

const cartSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema],
  coupon: {
    code: String,
    discount: Number,
    type: {
      type: String,
      enum: ['percentage', 'fixed']
    }
  },
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
  shippingMethod: {
    type: String,
    default: 'standard'
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  taxRate: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Calcular subtotal
cartSchema.virtual('subtotal').get(function() {
  return this.items.reduce((total, item) => {
    return total + (item.price * item.quantity);
  }, 0);
});

// Calcular descuento
cartSchema.virtual('discountAmount').get(function() {
  if (!this.coupon || !this.coupon.code) return 0;
  
  if (this.coupon.type === 'percentage') {
    return (this.subtotal * this.coupon.discount) / 100;
  } else {
    return Math.min(this.coupon.discount, this.subtotal);
  }
});

// Calcular impuestos
cartSchema.virtual('taxAmount').get(function() {
  return ((this.subtotal - this.discountAmount) * this.taxRate) / 100;
});

// Calcular total
cartSchema.virtual('total').get(function() {
  return this.subtotal - this.discountAmount + this.taxAmount + this.shippingCost;
});

// Método para agregar item al carrito
cartSchema.methods.addItem = async function(productId, quantity = 1, attributes = {}) {
  const Product = mongoose.model('Product');
  const product = await Product.findById(productId);
  
  if (!product) {
    throw new Error('Producto no encontrado');
  }
  
  if (!product.isAvailable() && product.trackQuantity) {
    throw new Error('Producto no disponible');
  }
  
  const existingItemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() &&
    JSON.stringify(item.attributes) === JSON.stringify(attributes)
  );
  
  if (existingItemIndex > -1) {
    this.items[existingItemIndex].quantity += quantity;
  } else {
    this.items.push({
      product: productId,
      quantity,
      price: product.price,
      attributes
    });
  }
  
  return this.save();
};

// Método para actualizar cantidad
cartSchema.methods.updateQuantity = function(productId, quantity, attributes = {}) {
  const itemIndex = this.items.findIndex(item => 
    item.product.toString() === productId.toString() &&
    JSON.stringify(item.attributes) === JSON.stringify(attributes)
  );
  
  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1);
    } else {
      this.items[itemIndex].quantity = quantity;
    }
  }
  
  return this.save();
};

// Método para limpiar carrito
cartSchema.methods.clear = function() {
  this.items = [];
  this.coupon = undefined;
  return this.save();
};

// Middleware para calcular automáticamente
cartSchema.pre('save', function(next) {
  // Actualizar precios de los items si es necesario
  this.items.forEach(item => {
    if (!item.price) {
      // Aquí podrías buscar el precio actual del producto
    }
  });
  next();
});

module.exports = mongoose.model('Cart', cartSchema);