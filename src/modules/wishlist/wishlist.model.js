const mongoose = require('mongoose');

/**
 * @schema wishlistSchema
 * @description Esquema de lista de deseos
 * 
 * SOURCE OF TRUTH para el módulo wishlist
 */
const wishlistSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido'],
    unique: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    // Snapshot de precio al momento de agregar (para comparación)
    priceWhenAdded: {
      type: Number,
      min: 0
    },
    // Notificar si hay cambio de precio
    notifyPriceChange: {
      type: Boolean,
      default: false
    },
    // Notificar si vuelve a estar disponible
    notifyAvailability: {
      type: Boolean,
      default: false
    }
  }],
  // Total de items (cache)
  itemCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// 📌 INDEXES
wishlistSchema.index({ user: 1 });
wishlistSchema.index({ 'items.product': 1 });
wishlistSchema.index({ 'items.addedAt': -1 });

/**
 * @middleware pre('save')
 * @description Actualiza itemCount automáticamente
 */
wishlistSchema.pre('save', function(next) {
  this.itemCount = this.items.length;
  next();
});

/**
 * @method addItem
 * @description Agrega producto a la wishlist (previene duplicados)
 * 
 * @param {ObjectId} productId - ID del producto
 * @param {Object} options - Opciones de notificación
 * @returns {Promise<Wishlist>}
 */
wishlistSchema.methods.addItem = function(productId, options = {}) {
  // Verificar si ya existe
  const exists = this.items.some(item => 
    item.product.toString() === productId.toString()
  );

  if (exists) {
    throw new Error('El producto ya está en tu lista de deseos');
  }

  this.items.push({
    product: productId,
    priceWhenAdded: options.price || 0,
    notifyPriceChange: options.notifyPriceChange || false,
    notifyAvailability: options.notifyAvailability || false
  });

  return this.save();
};

/**
 * @method removeItem
 * @description Elimina producto de la wishlist
 * 
 * @param {ObjectId} productId - ID del producto
 * @returns {Promise<Wishlist>}
 */
wishlistSchema.methods.removeItem = function(productId) {
  this.items = this.items.filter(item => 
    item.product.toString() !== productId.toString()
  );

  return this.save();
};

/**
 * @method clear
 * @description Vacía la wishlist
 * 
 * @returns {Promise<Wishlist>}
 */
wishlistSchema.methods.clear = function() {
  this.items = [];
  return this.save();
};

/**
 * @method hasProduct
 * @description Verifica si un producto está en la wishlist
 * 
 * @param {ObjectId} productId - ID del producto
 * @returns {boolean}
 */
wishlistSchema.methods.hasProduct = function(productId) {
  return this.items.some(item => 
    item.product.toString() === productId.toString()
  );
};

module.exports = mongoose.model('Wishlist', wishlistSchema);