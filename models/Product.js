const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  // Información básica
  name: {
    type: String,
    required: [true, 'El nombre del producto es requerido'],
    trim: true,
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    required: [true, 'La descripción es requerida'],
    maxlength: [2000, 'La descripción no puede tener más de 2000 caracteres']
  },
  shortDescription: {
    type: String,
    maxlength: [300, 'La descripción corta no puede tener más de 300 caracteres']
  },

  // Precios
  price: {
    type: Number,
    required: [true, 'El precio es requerido'],
    min: [0, 'El precio no puede ser negativo']
  },
  comparePrice: {
    type: Number,
    min: [0, 'El precio de comparación no puede ser negativo']
  },
  costPrice: {
    type: Number,
    min: [0, 'El precio de costo no puede ser negativo']
  },

  // Inventario
  sku: {
    type: String,
    required: true,
    unique: true,
    uppercase: true
  },
  stock: {
    type: Number,
    required: true,
    min: [0, 'El stock no puede ser negativo'],
    default: 0
  },
  trackQuantity: {
    type: Boolean,
    default: true
  },
  allowBackorder: {
    type: Boolean,
    default: false
  },

  // Categorización
  categories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],
  mainCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  },

  // Imágenes
  images: [{
    url: {
      type: String,
      required: true
    },
    altText: {
      type: String,
      default: ''
    },
    isPrimary: {
      type: Boolean,
      default: false
    }
  }],

  // Atributos
  brand: {
    type: String,
    trim: true
  },
  attributes: {
    size: [String],
    color: [String],
    material: [String]
  },

  // Variantes
  variants: [{
    sku: String,
    price: Number,
    stock: Number,
    attributes: {
      size: String,
      color: String
    },
    images: [String]
  }],

  // SEO
  seo: {
    title: String,
    description: String,
    metaKeywords: [String]
  },

  // Métricas
  views: {
    type: Number,
    default: 0
  },
  salesCount: {
    type: Number,
    default: 0
  },

  // Estado
  status: {
    type: String,
    enum: ['active', 'draft', 'archived'],
    default: 'draft'
  },
  isFeatured: {
    type: Boolean,
    default: false
  },
  isPublished: {
    type: Boolean,
    default: false
  }

}, {
  timestamps: true
});

// Middleware para generar slug y SKU
productSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9 -]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  if (this.isNew && !this.sku) {
    this.sku = 'SKU-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9).toUpperCase();
  }
  next();
});

// Índices para mejor performance
productSchema.index({ slug: 1 });
productSchema.index({ sku: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ status: 1, isPublished: 1 });
productSchema.index({ price: 1 });
productSchema.index({ isFeatured: 1 });
productSchema.index({ 'attributes.size': 1 });
productSchema.index({ 'attributes.color': 1 });

// Método para verificar disponibilidad
productSchema.methods.isAvailable = function() {
  return this.status === 'active' && 
         this.isPublished && 
         (this.stock > 0 || this.allowBackorder);
};

// Método para reducir stock
productSchema.methods.reduceStock = function(quantity) {
  if (this.trackQuantity) {
    this.stock = Math.max(0, this.stock - quantity);
  }
  return this.save();
};

module.exports = mongoose.model('Product', productSchema);