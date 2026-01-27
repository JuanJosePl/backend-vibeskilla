const mongoose = require("mongoose")

/**
 * @schema productSchema
 * @description Esquema profesional de productos con gestión completa
 *
 * SOURCE OF TRUTH para el módulo PRODUCTS
 *
 * Incluye:
 * - Información básica y SEO
 * - Gestión de inventario y variantes
 * - Ratings y reviews
 * - Auditoría y tracking
 * - Relaciones con otros modelos
 */
const productSchema = new mongoose.Schema(
  {
    // ============================================
    // INFORMACIÓN BÁSICA
    // ============================================
    name: {
      type: String,
      required: [true, "El nombre del producto es requerido"],
      trim: true,
      maxlength: [120, "El nombre no puede tener más de 120 caracteres"],
      minlength: [3, "El nombre debe tener al menos 3 caracteres"],
      index: true,
    },

    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      index: true,
    },

    description: {
      type: String,
      required: [true, "La descripción es requerida"],
      maxlength: [5000, "La descripción no puede tener más de 5000 caracteres"],
      minlength: [10, "La descripción debe tener al menos 10 caracteres"],
    },

    shortDescription: {
      type: String,
      maxlength: [300, "La descripción corta no puede tener más de 300 caracteres"],
    },

    // ============================================
    // PRECIOS Y COSTOS
    // ============================================
    price: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: [0, "El precio no puede ser negativo"],
      set: (v) => Number.parseFloat(v.toFixed(2)),
    },

    comparePrice: {
      type: Number,
      min: [0, "El precio de comparación no puede ser negativo"],
      set: (v) => (v ? Number.parseFloat(v.toFixed(2)) : undefined),
    },

    costPrice: {
      type: Number,
      min: [0, "El precio de costo no puede ser negativo"],
      set: (v) => (v ? Number.parseFloat(v.toFixed(2)) : undefined),
    },

    // ============================================
    // INVENTARIO Y SKU
    // ============================================
    sku: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },

    stock: {
      type: Number,
      required: true,
      min: [0, "El stock no puede ser negativo"],
      default: 0,
      index: true,
    },

    trackQuantity: {
      type: Boolean,
      default: true,
    },

    allowBackorder: {
      type: Boolean,
      default: false,
    },

    lowStockThreshold: {
      type: Number,
      default: 5,
      min: [0, "El umbral no puede ser negativo"],
    },

    // ============================================
    // CATEGORIZACIÓN
    // ============================================
    categories: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        index: true,
      },
    ],

    mainCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },

    tags: [
      {
        type: String,
        trim: true,
        lowercase: true,
      },
    ],

    // ============================================
    // MEDIOS (IMÁGENES)
    // ============================================
    images: [
      {
        _id: false,
        url: {
          type: String,
          required: true,
        },
        altText: {
          type: String,
          default: "",
        },
        title: {
          type: String,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
        order: {
          type: Number,
          default: 0,
        },
      },
    ],

    // ============================================
    // ATRIBUTOS Y VARIANTES
    // ============================================
    brand: {
      type: String,
      trim: true,
      index: true,
    },

attributes: {
  size: [{
    type: String,
    trim: true,
  }],

  color: [{
    type: String,
    trim: true,
  }],

  material: [{
    type: String,
    trim: true,
  }],

  weight: {
    type: String,
    default: null,
  },

  dimensions: {
    length: {
      type: Number,
      default: 0,
    },
    width: {
      type: Number,
      default: 0,
    },
    height: {
      type: Number,
      default: 0,
    },
    unit: {
      type: String,
      enum: ["cm", "mm", "in"],
      default: "cm",
    },
  },
},


    variants: [
      {
        _id: false,
        sku: {
          type: String,
          required: true,
          unique: true,
        },
        name: String,
        price: {
          type: Number,
          set: (v) => Number.parseFloat(v.toFixed(2)),
        },
        comparePrice: {
          type: Number,
          set: (v) => (v ? Number.parseFloat(v.toFixed(2)) : undefined),
        },
        stock: {
          type: Number,
          default: 0,
        },
        attributes: {
          size: String,
          color: String,
          material: String,
        },
        images: [String],
        isActive: {
          type: Boolean,
          default: true,
        },
      },
    ],

    // ============================================
    // SEO
    // ============================================
    seo: {
      title: {
        type: String,
        maxlength: [60, "El SEO title no puede exceder 60 caracteres"],
      },
      description: {
        type: String,
        maxlength: [160, "La SEO description no puede exceder 160 caracteres"],
      },
      metaKeywords: [String],
      canonicalUrl: String,
    },

    // ============================================
    // MÉTRICAS Y ANALYTICS
    // ============================================
    views: {
      type: Number,
      default: 0,
    },

    salesCount: {
      type: Number,
      default: 0,
    },

    rating: {
      average: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
        set: (v) => Number.parseFloat(v.toFixed(1)),
      },
      count: {
        type: Number,
        default: 0,
      },
      distribution: {
        _1: { type: Number, default: 0 },
        _2: { type: Number, default: 0 },
        _3: { type: Number, default: 0 },
        _4: { type: Number, default: 0 },
        _5: { type: Number, default: 0 },
      },
    },

    // ============================================
    // ESTADO Y CONTROL
    // ============================================
    status: {
      type: String,
      enum: ["active", "draft", "archived", "discontinued"],
      default: "draft",
      index: true,
    },

    visibility: {
      type: String,
      enum: ["public", "private", "hidden"],
      default: "public",
      index: true,
    },

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: Date,

    // ============================================
    // AUDITORÍA Y TRACKING
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    lastViewedAt: Date,

    // ============================================
    // CONFIGURACIÓN
    // ============================================
    isActive: {
      type: Boolean,
      default: true,
    },

    requiresShipping: {
      type: Boolean,
      default: true,
    },

    weight: {
      value: Number,
      unit: { type: String, default: "kg" },
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true, getters: true },
    toObject: { virtuals: true, getters: true },
  },
)

// ============================================
// ÍNDICES PARA OPTIMIZACIÓN
// ============================================

// Índice compuesto para búsquedas comunes
productSchema.index({ status: 1, isPublished: 1, isActive: 1 })
productSchema.index({ isFeatured: 1, createdAt: -1 })
productSchema.index({ price: 1, status: 1 })
productSchema.index({ categories: 1, status: 1 })
productSchema.index({ brand: 1, status: 1 })
productSchema.index({ "rating.average": -1, salesCount: -1 })

// Índice de texto para búsqueda full-text
productSchema.index({
  name: "text",
  description: "text",
  shortDescription: "text",
  brand: "text",
  tags: "text",
})

// Índice TTL para productos temporales (si aplica)
productSchema.index({ publishedAt: 1 }, { sparse: true })

// ============================================
// VIRTUALS
// ============================================

/**
 * @virtual discount
 * @description Calcula porcentaje de descuento
 */
productSchema.virtual("discount").get(function () {
  if (!this.comparePrice || this.comparePrice <= this.price) return 0
  return Math.round(((this.comparePrice - this.price) / this.comparePrice) * 100)
})

/**
 * @virtual profit
 * @description Calcula ganancia potencial
 */
productSchema.virtual("profit").get(function () {
  if (!this.costPrice) return 0
  return Number.parseFloat((this.price - this.costPrice).toFixed(2))
})

/**
 * @virtual profitMargin
 * @description Porcentaje de margen de ganancia
 */
productSchema.virtual("profitMargin").get(function () {
  if (!this.costPrice || this.costPrice === 0) return 0
  return Math.round(((this.price - this.costPrice) / this.price) * 100)
})

/**
 * @virtual primaryImage
 * @description Obtiene imagen principal
 */
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null
  const primary = this.images.find((img) => img.isPrimary)
  return primary || this.images[0]
})

/**
 * @virtual isLowStock
 * @description Verifica si el stock es bajo
 */
productSchema.virtual("isLowStock").get(function () {
  return this.trackQuantity && this.stock <= this.lowStockThreshold
})

/**
 * @virtual isOutOfStock
 * @description Verifica si está sin stock
 */
productSchema.virtual("isOutOfStock").get(function () {
  return this.trackQuantity && this.stock === 0 && !this.allowBackorder
})

/**
 * ✅ NUEVO - Virtual para disponibilidad
 */
productSchema.virtual("availability").get(function () {
  if (!this.trackQuantity) return "available"
  if (this.stock > this.lowStockThreshold) return "in_stock"
  if (this.stock > 0 && this.stock <= this.lowStockThreshold) return "low_stock"
  if (this.stock === 0 && this.allowBackorder) return "backorder"
  return "out_of_stock"
})

// ============================================
// MIDDLEWARES PRE-SAVE
// ============================================

/**
 * @middleware pre('save')
 * @description Auto-genera slug, SKU y normaliza datos
 */
productSchema.pre("save", async function (next) {
  try {
    // Generar slug si el nombre cambió
    if (this.isModified("name") && !this.slug) {
      this.slug = this.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()

      // Verificar unicidad de slug
      const existing = await mongoose.model("Product").findOne({
        slug: this.slug,
        _id: { $ne: this._id },
      })

      if (existing) {
        this.slug = `${this.slug}-${Date.now()}`
      }
    }

    // Generar SKU si es nuevo
    if (this.isNew && !this.sku) {
      let unique = false
      let sku

      while (!unique) {
        sku = `SKU-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
        const existing = await mongoose.model("Product").findOne({ sku })
        unique = !existing
      }

      this.sku = sku
    }

    // Normalizar URL de imágenes
    if (this.images && this.images.length > 0) {
      this.images.forEach((img, idx) => {
        if (!img.order) img.order = idx
      })
      this.images.sort((a, b) => a.order - b.order)
    }

    // Asegurar que solo una imagen sea primaria
    if (this.images && this.images.length > 0) {
      const primaryCount = this.images.filter((img) => img.isPrimary).length
      if (primaryCount === 0) {
        this.images[0].isPrimary = true
      } else if (primaryCount > 1) {
        this.images.forEach((img) => (img.isPrimary = false))
        this.images[0].isPrimary = true
      }
    }

    // Establecer publishedAt cuando se publica
    if (this.isModified("isPublished") && this.isPublished && !this.publishedAt) {
      this.publishedAt = new Date()
    }

    next()
  } catch (error) {
    next(error)
  }
})

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

/**
 * @method isAvailable
 * @description Verifica si el producto está disponible para compra
 */
productSchema.methods.isAvailable = function () {
  return this.status === "active" && this.isPublished && this.isActive && (this.stock > 0 || this.allowBackorder)
}

/**
 * @method reduceStock
 * @description Reduce el stock
 */
productSchema.methods.reduceStock = async function (quantity) {
  if (this.trackQuantity) {
    this.stock = Math.max(0, this.stock - quantity)
    return await this.save()
  }
  return this
}

/**
 * @method increaseStock
 * @description Aumenta el stock
 */
productSchema.methods.increaseStock = async function (quantity) {
  if (this.trackQuantity) {
    this.stock += quantity
    return await this.save()
  }
  return this
}

/**
 * @method incrementSales
 * @description Incrementa contador de ventas
 */
productSchema.methods.incrementSales = async function (quantity = 1) {
  this.salesCount += quantity
  return await this.save()
}

/**
 * @method incrementViews
 * @description Incrementa vistas (sin bloquear)
 */
productSchema.methods.incrementViews = async function () {
  this.views += 1
  this.lastViewedAt = new Date()
  return await this.save()
}

/**
 * @method updateRating
 * @description Actualiza rating basado en nueva reseña
 */
productSchema.methods.updateRating = async function (newRating) {
  const total = this.rating.count * this.rating.average
  this.rating.count += 1
  this.rating.average = Number.parseFloat((total + newRating) / this.rating.count).toFixed(1)

  // Actualizar distribución
  if (newRating === 1) this.rating.distribution._1 += 1
  else if (newRating === 2) this.rating.distribution._2 += 1
  else if (newRating === 3) this.rating.distribution._3 += 1
  else if (newRating === 4) this.rating.distribution._4 += 1
  else if (newRating === 5) this.rating.distribution._5 += 1

  return await this.save()
}

/**
 * @method getVariant
 * @description Obtiene variante por SKU
 */
productSchema.methods.getVariant = function (variantSku) {
  return this.variants.find((v) => v.sku === variantSku)
}

/**
 * ✅ NUEVO - Obtener contexto SEO completo (incluyendo categoría)
 */
productSchema.methods.getSEOContext = async function () {
  const Category = mongoose.model("Category")
  
  let categoryContext = null
  if (this.mainCategory) {
    const category = await Category.findById(this.mainCategory)
    if (category) {
      categoryContext = await category.getSEOContext()
    }
  }

  // Combinar keywords del producto + categoría
  const productKeywords = this.seo?.metaKeywords || []
  const categoryKeywords = categoryContext?.keywords || []
  const allKeywords = [...new Set([...productKeywords, ...categoryKeywords])]

  return {
    title: this.seo?.title || this.name,
    description: this.seo?.description || this.shortDescription || this.description?.substring(0, 160),
    keywords: allKeywords,
    ogTitle: this.seo?.title || this.name,
    ogDescription: this.seo?.description || this.shortDescription || this.description?.substring(0, 160),
    ogImage: this.primaryImage?.url || null,
    canonicalUrl: this.seo?.canonicalUrl || `/products/${this.slug}`,
    breadcrumb: categoryContext?.breadcrumb || [],
    category: categoryContext ? {
      name: categoryContext.title,
      slug: this.mainCategory.slug,
      url: categoryContext.canonicalUrl
    } : null
  }
}

/**
 * @method toJSON
 * @description Personaliza serialización JSON
 */
productSchema.methods.toJSON = function () {
  const product = this.toObject()

  // Solo incluir campos necesarios en respuestas
  if (this._doc && !this._doc.includeDetails) {
    delete product.createdBy
    delete product.updatedBy
  }

  return product
}

module.exports = mongoose.model("Product", productSchema)