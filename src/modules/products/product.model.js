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
      min: 0,
      default: 5,
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
      index: true,
    },

    tags: [
      {
        type: String,
        lowercase: true,
        trim: true,
      },
    ],

    // ============================================
    // IMÁGENES Y MEDIOS
    // ============================================
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        altText: {
          type: String,
          maxlength: 200,
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
    // MARCA Y ATRIBUTOS
    // ============================================
    brand: {
      type: String,
      trim: true,
      maxlength: 100,
      index: true,
    },

    attributes: {
      size: [String],
      color: [String],
      material: [String],
      weight: String,
      dimensions: {
        length: Number,
        width: Number,
        height: Number,
        unit: {
          type: String,
          enum: ["cm", "in", "m"],
          default: "cm",
        },
      },
    },

    // ============================================
    // VARIANTES
    // ============================================
    variants: [
      {
        sku: {
          type: String,
          required: true,
        },
        name: String,
        price: Number,
        comparePrice: Number,
        stock: Number,
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
    // SEO Y METADATA
    // ============================================
    seo: {
      title: {
        type: String,
        maxlength: 60,
      },
      description: {
        type: String,
        maxlength: 160,
      },
      metaKeywords: [String],
      canonicalUrl: String,
    },

    // ============================================
    // RATING Y REVIEWS
    // ============================================
    rating: {
      average: {
        type: Number,
        min: 0,
        max: 5,
        default: 0,
        set: (v) => Number.parseFloat(v.toFixed(1)),
      },
      count: {
        type: Number,
        min: 0,
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
    // ESTADO Y VISIBILIDAD
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

    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: false,
      index: true,
    },

    publishedAt: Date,

    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // ============================================
    // ENVÍO Y LOGÍSTICA
    // ============================================
    requiresShipping: {
      type: Boolean,
      default: true,
    },

    weight: {
      value: Number,
      unit: {
        type: String,
        enum: ["kg", "g", "lb", "oz"],
        default: "kg",
      },
    },

    // ============================================
    // ANÁLISIS Y TRACKING
    // ============================================
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    salesCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    lastViewedAt: Date,

    // ============================================
    // AUDITORÍA
    // ============================================
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// ============================================
// ÍNDICES COMPUESTOS
// ============================================
productSchema.index({ status: 1, isPublished: 1, isActive: 1 })
productSchema.index({ categories: 1, status: 1 })
productSchema.index({ mainCategory: 1, status: 1 })
productSchema.index({ price: 1 })
productSchema.index({ salesCount: -1 })
productSchema.index({ views: -1 })
productSchema.index({ "rating.average": -1 })
productSchema.index({ isFeatured: 1, status: 1 })
productSchema.index({ createdAt: -1 })
productSchema.index({ name: "text", description: "text", tags: "text" })

// ============================================
// VIRTUALS
// ============================================

/**
 * @virtual primaryImage
 * @description Retorna la imagen primaria o la primera
 */
productSchema.virtual("primaryImage").get(function () {
  if (!this.images || this.images.length === 0) return null
  return this.images.find((img) => img.isPrimary) || this.images[0]
})

/**
 * @virtual profit
 * @description Calcula la ganancia neta
 */
productSchema.virtual("profit").get(function () {
  if (!this.costPrice) return 0
  return this.price - this.costPrice
})

/**
 * @virtual profitMargin
 * @description Calcula el margen de ganancia en porcentaje
 */
productSchema.virtual("profitMargin").get(function () {
  if (!this.costPrice || this.costPrice === 0) return 0
  return Math.round((this.profit / this.price) * 100)
})

/**
 * @virtual availability
 * @description Estado de disponibilidad calculado
 */
productSchema.virtual("availability").get(function () {
  if (!this.trackQuantity) return "available"
  if (this.stock > this.lowStockThreshold) return "in_stock"
  if (this.stock > 0 && this.stock <= this.lowStockThreshold) return "low_stock"
  if (this.stock === 0 && this.allowBackorder) return "backorder"
  return "out_of_stock"
})

// ============================================
// MIDDLEWARE
// ============================================

/**
 * @middleware pre('save')
 * @description Validaciones y generación de slug/SKU
 */
productSchema.pre("save", async function (next) {
  try {
    // Generar slug si es nuevo o se modificó el nombre
    if (this.isNew || this.isModified("name")) {
      const slug = this.name
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-")
        .trim()

      // Verificar unicidad
      const existing = await this.constructor.findOne({
        slug,
        _id: { $ne: this._id },
      })

      this.slug = existing ? `${slug}-${Date.now()}` : slug
    }

    // Generar SKU si es nuevo y no tiene SKU
    if (this.isNew && !this.sku) {
      const prefix = "SKU"
      const timestamp = Date.now().toString(36).toUpperCase()
      const random = Math.random().toString(36).substr(2, 9).toUpperCase()
      let sku = `${prefix}-${timestamp}-${random}`

      // Verificar unicidad
      const existingSku = await this.constructor.findOne({ sku })
      if (existingSku) {
        sku = `${prefix}-${Date.now()}-${random}`
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
 * ✅ MEJORADO - Obtener contexto SEO completo (incluyendo categoría con breadcrumb)
 */
productSchema.methods.getSEOContext = async function () {
  const Category = mongoose.model("Category")
  
  let categoryContext = null
  let breadcrumb = []
  let categoryInfo = null
  
  if (this.mainCategory) {
    const category = await Category.findById(this.mainCategory)
    if (category) {
      categoryContext = await category.getSEOContext()
      breadcrumb = categoryContext.breadcrumb || []
      categoryInfo = {
        name: category.name,
        slug: category.slug,
        url: `/categories/${category.slug}`
      }
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
    breadcrumb: breadcrumb,
    category: categoryInfo
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