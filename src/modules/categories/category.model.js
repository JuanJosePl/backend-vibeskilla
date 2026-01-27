const mongoose = require("mongoose")

/**
 * @schema categorySchema
 * @description Esquema profesional de categorías con SEO, jerarquía y auditoría
 *
 * AGREGADO: Category es raíz
 * VALUE OBJECTS: slug, metadata, images
 *
 * SOURCE OF TRUTH para categorías
 */
const categorySchema = new mongoose.Schema(
  {
    // Información base
    name: {
      type: String,
      required: [true, "El nombre de la categoría es requerido"],
      trim: true,
      unique: true,
      maxlength: [100, "El nombre no puede exceder 100 caracteres"],
      minlength: [2, "El nombre debe tener al menos 2 caracteres"],
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
      maxlength: [1000, "La descripción no puede exceder 1000 caracteres"],
      trim: true,
    },

    // Jerarquía de categorías
    parentCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
      index: true,
    },

    // Imágenes y medios
    images: {
      thumbnail: {
        type: String,
        default: null,
      },
      hero: {
        type: String,
        default: null,
      },
      icon: {
        type: String,
        default: null,
      },
    },

    // SEO y metadata
    seo: {
      metaTitle: {
        type: String,
        maxlength: 60,
        default: null,
      },
      metaDescription: {
        type: String,
        maxlength: 160,
        default: null,
      },
      keywords: [
        {
          type: String,
          maxlength: 50,
        },
      ],
      ogImage: String,
      ogDescription: String,
    },

    // Control de visibilidad
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isPublished: {
      type: Boolean,
      default: true,
      index: true,
    },

    featured: {
      type: Boolean,
      default: false,
      index: true,
    },

    // Ordenamiento
    order: {
      type: Number,
      default: 0,
      index: true,
    },

    // Análisis
    views: {
      type: Number,
      default: 0,
      min: 0,
    },

    productCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Auditoría
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // Soft delete
    status: {
      type: String,
      enum: ["active", "archived", "draft"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// 📌 ÍNDICES COMPUESTOS PARA BÚSQUEDAS RÁPIDAS
categorySchema.index({ isActive: 1, isPublished: 1, status: 1 })
categorySchema.index({ featured: 1, order: 1 })
categorySchema.index({ parentCategory: 1, isActive: 1 })
categorySchema.index({ "seo.keywords": 1 })
categorySchema.index({ createdAt: -1 })

/**
 * @middleware pre('save')
 * @description Genera slug único automáticamente
 */
categorySchema.pre("save", async function (next) {
  if (this.isModified("name") || (!this.slug && this.name)) {
    this.slug = await this._generateUniqueSlug(this.name)
  }
  next()
})

/**
 * @method _generateUniqueSlug
 * @description Genera un slug único basado en el nombre
 */
categorySchema.methods._generateUniqueSlug = async function (name) {
  const slug = name
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

  if (existing) {
    return `${slug}-${Date.now()}`
  }

  return slug
}

/**
 * @virtual pathName
 * @description Retorna la ruta completa de la categoría (ej: Electronics > Phones > 5G)
 */
categorySchema.virtual("pathName").get(function () {
  return this._pathCache || this.name
})

/**
 * @method getPath
 * @description Obtiene la ruta jerárquica completa de la categoría
 *
 * @returns {Promise<Array>} Array de categorías padres
 */
categorySchema.methods.getPath = async function () {
  const path = [this]
  let current = this

  while (current.parentCategory) {
    current = await this.constructor.findById(current.parentCategory)
    if (current) {
      path.unshift(current)
    } else {
      break
    }
  }

  return path
}

/**
 * @method getBreadcrumb
 * @description Retorna breadcrumb para frontend
 *
 * @returns {Promise<Array>} Breadcrumb structure
 */
categorySchema.methods.getBreadcrumb = async function () {
  const path = await this.getPath()
  return path.map((cat) => ({
    name: cat.name,
    slug: cat.slug,
    url: `/categories/${cat.slug}`,
  }))
}

/**
 * @method incrementViews
 * @description Incrementa contador de vistas
 */
categorySchema.methods.incrementViews = async function () {
  return this.constructor.findByIdAndUpdate(this._id, { $inc: { views: 1 } }, { new: true })
}

/**
 * @method updateProductCount
 * @description Actualiza conteo de productos asociados
 */
categorySchema.methods.updateProductCount = async function () {
  const Product = mongoose.model("Product")
  const count = await Product.countDocuments({
    categories: this._id,
    status: "active",
    isPublished: true,
  })

  return this.constructor.findByIdAndUpdate(this._id, { productCount: count }, { new: true })
}

/**
 * ✅ NUEVO - Obtener keywords SEO acumulados de la jerarquía
 * @method getSEOKeywords
 * @description Retorna keywords de esta categoría + padres
 */
categorySchema.methods.getSEOKeywords = async function () {
  const path = await this.getPath()
  const keywords = new Set()

  path.forEach((cat) => {
    if (cat.seo && cat.seo.keywords) {
      cat.seo.keywords.forEach((kw) => keywords.add(kw))
    }
  })

  return Array.from(keywords)
}

/**
 * ✅ NUEVO - Obtener contexto SEO completo para frontend
 * @method getSEOContext
 * @description Retorna objeto SEO optimizado para meta tags
 */
categorySchema.methods.getSEOContext = async function () {
  const breadcrumb = await this.getBreadcrumb()
  const keywords = await this.getSEOKeywords()

  return {
    title: this.seo?.metaTitle || this.name,
    description: this.seo?.metaDescription || this.description || `Productos de ${this.name}`,
    keywords: keywords,
    ogTitle: this.seo?.metaTitle || this.name,
    ogDescription: this.seo?.ogDescription || this.description || `Explora nuestra categoría de ${this.name}`,
    ogImage: this.seo?.ogImage || this.images?.hero || this.images?.thumbnail || null,
    canonicalUrl: `/categories/${this.slug}`,
    breadcrumb: breadcrumb,
  }
}

/**
 * @method toJSON
 * @description Formatea respuesta JSON removiendo campos sensibles
 */
categorySchema.methods.toJSON = function () {
  const obj = this.toObject()
  delete obj.__v
  return obj
}

module.exports = mongoose.model("Category", categorySchema)