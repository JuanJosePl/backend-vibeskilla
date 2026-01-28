/**
 * @module product.utils
 * @description Utilidades específicas del módulo PRODUCTS + DTOs para frontend
 */

const { slugify } = require("../../core/utils/slugify")

/**
 * Generar SKU único
 */
const generateUniqueSKU = (prefix = "SKU") => {
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.random().toString(36).substr(2, 9).toUpperCase()
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Normalizar datos de producto
 */
const normalizeProductData = (data) => {
  return {
    ...data,
    name: data.name?.trim() || "",
    slug: data.slug ? slugify(data.slug) : "",
    description: data.description?.trim() || "",
    shortDescription: data.shortDescription?.trim() || "",
    price: Number.parseFloat(data.price) || 0,
    comparePrice: data.comparePrice ? Number.parseFloat(data.comparePrice) : undefined,
    costPrice: data.costPrice ? Number.parseFloat(data.costPrice) : undefined,
    stock: Number.parseInt(data.stock) || 0,
    brand: data.brand?.trim() || "",
    tags: Array.isArray(data.tags) ? data.tags.map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
  }
}

/**
 * Calcular descuento
 */
const calculateDiscount = (price, comparePrice) => {
  if (!comparePrice || comparePrice <= price) return 0
  return Math.round(((comparePrice - price) / comparePrice) * 100)
}

/**
 * Calcular margen de ganancia
 */
const calculateProfitMargin = (price, costPrice) => {
  if (!costPrice || costPrice === 0) return 0
  return Math.round(((price - costPrice) / price) * 100)
}

/**
 * Validar rango de precio
 */
const validatePriceRange = (minPrice, maxPrice, price) => {
  if (minPrice && price < minPrice) return false
  if (maxPrice && price > maxPrice) return false
  return true
}

/**
 * Obtener estado de disponibilidad
 */
const getAvailabilityStatus = (product) => {
  if (!product.trackQuantity) return "available"
  if (product.stock > product.lowStockThreshold) return "in_stock"
  if (product.stock > 0 && product.stock <= product.lowStockThreshold) return "low_stock"
  if (product.stock === 0 && product.allowBackorder) return "backorder"
  return "out_of_stock"
}

/**
 * ============================================
 * ✅ DTOs PARA FRONTEND REACT
 * ============================================
 */

/**
 * ✅ ProductCardDTO - Para grids/listados
 */
class ProductCardDTO {
  constructor(product) {
    this._id = product._id
    this.name = product.name
    this.slug = product.slug
    this.price = product.price
    this.comparePrice = product.comparePrice || null
    this.discount = calculateDiscount(product.price, product.comparePrice)
    this.image = product.primaryImage?.url || product.images?.[0]?.url || null
    this.brand = product.brand || null
    this.rating = {
      average: product.rating?.average || 0,
      count: product.rating?.count || 0
    }
    this.availability = getAvailabilityStatus(product)
    this.inStock = product.stock > 0 || product.allowBackorder
    this.isFeatured = product.isFeatured || false
    this.url = `/products/${product.slug}`
    
    // UI helpers
    this.hasDiscount = this.discount > 0
    this.hasRating = (product.rating?.count || 0) > 0
    this.stockBadge = this._getStockBadge(product)
  }

  _getStockBadge(product) {
    const status = getAvailabilityStatus(product)
    const badges = {
      in_stock: { text: "En stock", color: "green" },
      low_stock: { text: "Pocas unidades", color: "orange" },
      backorder: { text: "Bajo pedido", color: "blue" },
      out_of_stock: { text: "Agotado", color: "red" },
      available: { text: "Disponible", color: "green" }
    }
    return badges[status] || badges.available
  }
}

/**
 * ✅ ProductDetailDTO - Para página de detalle
 */
class ProductDetailDTO {
  constructor(product, extras = {}) {
    // Datos básicos
    this._id = product._id
    this.name = product.name
    this.slug = product.slug
    this.description = product.description
    this.shortDescription = product.shortDescription || ""
    this.sku = product.sku
    
    // Precios
    this.price = product.price
    this.comparePrice = product.comparePrice || null
    this.discount = calculateDiscount(product.price, product.comparePrice)
    
    // Imágenes
    this.images = product.images || []
    this.primaryImage = product.primaryImage || (product.images?.[0] || null)
    
    // Categorías
    this.categories = product.categories || []
    this.mainCategory = product.mainCategory || null
    this.breadcrumb = extras.breadcrumb || []
    
    // Inventario
    this.stock = product.stock
    this.availability = getAvailabilityStatus(product)
    this.inStock = product.stock > 0 || product.allowBackorder
    this.lowStockThreshold = product.lowStockThreshold
    this.isLowStock = product.stock > 0 && product.stock <= product.lowStockThreshold
    
    // Rating
    this.rating = {
      average: product.rating?.average || 0,
      count: product.rating?.count || 0,
      distribution: product.rating?.distribution || {}
    }
    
    // Atributos
    this.brand = product.brand || null
    this.tags = product.tags || []
    this.attributes = product.attributes || {}
    this.variants = product.variants || []
    
    // SEO
    this.seo = product.seo || {}
    if (extras.seoContext) {
      this.seoContext = extras.seoContext
    }
    
    // Metadata
    this.isFeatured = product.isFeatured || false
    this.views = product.views || 0
    this.salesCount = product.salesCount || 0
    this.createdAt = product.createdAt
    this.updatedAt = product.updatedAt
    this.url = `/products/${product.slug}`
    
    // UI helpers
    this.hasDiscount = this.discount > 0
    this.hasRating = (product.rating?.count || 0) > 0
    this.hasVariants = (product.variants?.length || 0) > 0
    this.stockBadge = this._getStockBadge(product)
    this.availabilityText = this._getAvailabilityText(product)
  }

  _getStockBadge(product) {
    const status = getAvailabilityStatus(product)
    const badges = {
      in_stock: { text: "En stock", color: "green", icon: "check" },
      low_stock: { text: `Solo ${product.stock} disponibles`, color: "orange", icon: "alert" },
      backorder: { text: "Disponible bajo pedido", color: "blue", icon: "clock" },
      out_of_stock: { text: "Agotado", color: "red", icon: "x" },
      available: { text: "Disponible", color: "green", icon: "check" }
    }
    return badges[status] || badges.available
  }

  _getAvailabilityText(product) {
    if (product.stock > product.lowStockThreshold) {
      return "Disponible para envío inmediato"
    }
    if (product.stock > 0 && product.stock <= product.lowStockThreshold) {
      return `Solo quedan ${product.stock} unidades`
    }
    if (product.stock === 0 && product.allowBackorder) {
      return "Disponible bajo pedido (3-5 días hábiles)"
    }
    return "Agotado temporalmente"
  }
}

/**
 * ✅ ProductListDTO - Para listados con filtros
 */
class ProductListDTO {
  constructor(product) {
    this._id = product._id
    this.name = product.name
    this.slug = product.slug
    this.shortDescription = product.shortDescription || ""
    this.price = product.price
    this.comparePrice = product.comparePrice || null
    this.discount = calculateDiscount(product.price, product.comparePrice)
    this.image = product.primaryImage?.url || product.images?.[0]?.url || null
    this.brand = product.brand || null
    this.categories = product.categories || []
    this.rating = {
      average: product.rating?.average || 0,
      count: product.rating?.count || 0
    }
    this.availability = getAvailabilityStatus(product)
    this.inStock = product.stock > 0 || product.allowBackorder
    this.stock = product.stock
    this.isFeatured = product.isFeatured || false
    this.url = `/products/${product.slug}`
    
    // UI helpers
    this.hasDiscount = this.discount > 0
    this.hasRating = (product.rating?.count || 0) > 0
  }
}

/**
 * ✅ ProductSEODTO - Para contexto SEO reutilizable
 */
class ProductSEODTO {
  constructor(seoContext) {
    this.title = seoContext.title
    this.description = seoContext.description
    this.keywords = seoContext.keywords || []
    this.ogTitle = seoContext.ogTitle
    this.ogDescription = seoContext.ogDescription
    this.ogImage = seoContext.ogImage
    this.canonicalUrl = seoContext.canonicalUrl
    this.breadcrumb = seoContext.breadcrumb || []
    this.category = seoContext.category || null
    
    // Meta tags listos para usar
    this.metaTags = {
      title: this.title,
      description: this.description,
      keywords: this.keywords.join(", "),
      "og:title": this.ogTitle,
      "og:description": this.ogDescription,
      "og:image": this.ogImage,
      "og:url": this.canonicalUrl,
      canonical: this.canonicalUrl,
      "og:type": "product"
    }
  }
}

/**
 * Formatear producto para respuesta pública
 */
const formatProductResponse = (product) => {
  return new ProductCardDTO(product)
}

/**
 * Formatear producto para respuesta admin
 */
const formatProductAdmin = (product) => {
  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    sku: product.sku,
    price: product.price,
    comparePrice: product.comparePrice,
    costPrice: product.costPrice,
    profit: product.profit,
    profitMargin: product.profitMargin,
    stock: product.stock,
    status: product.status,
    salesCount: product.salesCount,
    views: product.views,
    rating: product.rating,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt,
  }
}

module.exports = {
  generateUniqueSKU,
  normalizeProductData,
  calculateDiscount,
  calculateProfitMargin,
  validatePriceRange,
  getAvailabilityStatus,
  formatProductResponse,
  formatProductAdmin,
  // ✅ DTOs
  ProductCardDTO,
  ProductDetailDTO,
  ProductListDTO,
  ProductSEODTO
}