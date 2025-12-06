/**
 * @module product.utils
 * @description Utilidades específicas del módulo PRODUCTS
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
  if (product.stock > product.lowStockThreshold) {
    return "available"
  } else if (product.stock > 0 && product.stock <= product.lowStockThreshold) {
    return "low_stock"
  } else if (product.stock === 0 && product.allowBackorder) {
    return "backorder"
  } else {
    return "out_of_stock"
  }
}

/**
 * Formatear producto para respuesta pública
 */
const formatProductResponse = (product) => {
  return {
    id: product._id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    comparePrice: product.comparePrice,
    discount: calculateDiscount(product.price, product.comparePrice),
    image: product.primaryImage,
    brand: product.brand,
    rating: product.rating,
    inStock: product.stock > 0 || product.allowBackorder,
    availability: getAvailabilityStatus(product),
  }
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
}
