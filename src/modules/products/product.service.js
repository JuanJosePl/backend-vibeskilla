const Product = require("./product.model")
const Category = require("../categories/category.model")
const ApiError = require("../../core/errors/ApiError")
const { 
  ProductCardDTO, 
  ProductDetailDTO, 
  ProductListDTO, 
  ProductSEODTO 
} = require("./product.utils")

/**
 * @class ProductService
 * @description Lógica de negocio para productos
 * 
 * ✅ ACTUALIZADO según contrato frontend-backend:
 * - DTOs optimizados para cards/grids/detalle
 * - SEO context reutilizable desde categorías
 * - Respuestas usando 'data' consistentemente
 * - Método getProductsByCategory dedicado
 */
class ProductService {
  /**
   * ✅ MEJORADO - Obtener productos con DTOs optimizados
   */
  async getProducts(filters) {
    const {
      page = 1,
      limit = 12,
      sort = "createdAt",
      order = "desc",
      category,
      search,
      minPrice,
      maxPrice,
      status = "active",
      featured,
      inStock,
      brand,
      visibility = "public",
      includeInactive = false,
    } = filters

    const query = {
      status,
      visibility,
    }

    if (!includeInactive) {
      query.isPublished = true
      query.isActive = true
    }

    if (category) {
      try {
        const categoryDoc = await Category.findOne({
          $or: [{ slug: category }, { _id: category }],
        })
        if (categoryDoc) {
          query.categories = categoryDoc._id
        } else {
          throw ApiError.notFound("Categoría no encontrada")
        }
      } catch (error) {
        if (error.status) throw error
        throw ApiError.badRequest("ID de categoría inválido")
      }
    }

    if (search && search.trim().length > 0) {
      query.$text = { $search: search }
    }

    if (minPrice || maxPrice) {
      query.price = {}
      if (minPrice) query.price.$gte = Number(minPrice)
      if (maxPrice) query.price.$lte = Number(maxPrice)
    }

    if (brand) {
      query.brand = new RegExp(brand, "i")
    }

    if (featured !== undefined) {
      query.isFeatured = featured === "true" || featured === true
    }

    if (inStock === "true" || inStock === true) {
      query.$or = [{ stock: { $gt: 0 }, trackQuantity: true }, { allowBackorder: true }]
    }

    const sortOptions = {}
    const validSortFields = ["createdAt", "price", "name", "salesCount", "views", "rating.average"]

    if (validSortFields.includes(sort)) {
      sortOptions[sort] = order === "desc" ? -1 : 1
    } else {
      sortOptions.createdAt = -1
    }

    const skip = (page - 1) * limit
    const limitInt = Math.min(Number.parseInt(limit), 100)

    const [products, total] = await Promise.all([
      Product.find(query)
        .sort(sortOptions)
        .limit(limitInt)
        .skip(skip)
        .populate("categories", "name slug")
        .populate("mainCategory", "name slug")
        .select("-createdBy -updatedBy")
        .lean(),
      Product.countDocuments(query),
    ])

    // ✅ Usar ProductListDTO
    const dtoProducts = products.map(p => new ProductListDTO(p))

    return {
      products: dtoProducts,
      pagination: {
        current: Number.parseInt(page),
        limit: limitInt,
        pages: Math.ceil(total / limitInt),
        total,
        hasNextPage: skip + limitInt < total,
        hasPrevPage: page > 1,
      },
    }
  }

  /**
   * ✅ NUEVO - Obtener productos por categoría (ruta dedicada)
   * Frontend usa: GET /products/category/:categorySlug
   */
  async getProductsByCategory(categorySlug, filters = {}) {
    // Buscar categoría
    const category = await Category.findOne({
      slug: categorySlug,
      status: "active",
      isPublished: true
    })

    if (!category) {
      throw ApiError.notFound("Categoría no encontrada")
    }

    // Usar getProducts con el filtro de categoría
    return this.getProducts({
      ...filters,
      category: category._id
    })
  }

  /**
   * ✅ MEJORADO - Obtener producto por slug con SEO context completo
   */
  async getProductBySlug(slug) {
    const product = await Product.findOne({
      slug,
      status: "active",
      isPublished: true,
      isActive: true,
    })
      .populate("categories", "name slug description")
      .populate("mainCategory", "name slug")

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    // Incrementar vistas asíncrono
    Product.findByIdAndUpdate(product._id, { $inc: { views: 1 }, lastViewedAt: new Date() }, { new: false }).exec()

    // ✅ CRÍTICO: Obtener contexto SEO completo (incluye breadcrumb de categoría)
    const seoContext = await product.getSEOContext()

    // ✅ Usar ProductDetailDTO con SEO context y breadcrumb
    return new ProductDetailDTO(product, {
      breadcrumb: seoContext.breadcrumb,
      seoContext: new ProductSEODTO(seoContext)
    })
  }

  /**
   * ✅ MEJORADO - Obtener producto por ID con estructura completa
   */
  async getProductById(productId) {
    const product = await Product.findById(productId)
      .populate("categories", "name slug")
      .populate("mainCategory", "name slug")
      .populate("createdBy", "profile.firstName profile.lastName email")
      .lean()

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    // ✅ CRÍTICO: Asegurar que TODOS los campos existan con valores por defecto
    return {
      ...product,
      shortDescription: product.shortDescription || "",
      
      // ✅ Asegurar estructura completa de attributes
      attributes: {
        size: product.attributes?.size || [],
        color: product.attributes?.color || [],
        material: product.attributes?.material || [],
        weight: product.attributes?.weight || null,
        dimensions: {
          length: product.attributes?.dimensions?.length || 0,
          width: product.attributes?.dimensions?.width || 0,
          height: product.attributes?.dimensions?.height || 0,
          unit: product.attributes?.dimensions?.unit || "cm",
        },
      },
      
      // ✅ Asegurar estructura completa de SEO
      seo: {
        title: product.seo?.title || "",
        description: product.seo?.description || "",
        metaKeywords: product.seo?.metaKeywords || [],
      },
      
      // ✅ Asegurar estructura completa de weight
      weight: {
        value: product.weight?.value || undefined,
        unit: product.weight?.unit || "kg",
      },
    }
  }

  /**
   * ✅ MEJORADO - Obtener productos destacados con DTOs
   */
  async getFeaturedProducts(limit = 8) {
    const products = await Product.find({
      isFeatured: true,
      status: "active",
      isPublished: true,
      isActive: true,
    })
      .limit(limit)
      .populate("categories", "name slug")
      .populate("mainCategory", "name slug")
      .select("-createdBy -updatedBy -description")
      .sort({ createdAt: -1 })
      .lean()

    // ✅ Usar ProductCardDTO
    return products.map(p => new ProductCardDTO(p))
  }

  /**
   * Obtener productos relacionados
   */
  async getRelatedProducts(productId, options = {}) {
    const { limit = 4 } = options

    const currentProduct = await Product.findById(productId)
    if (!currentProduct) {
      throw ApiError.notFound("Producto no encontrado")
    }

    const relatedQuery = {
      _id: { $ne: productId },
      status: "active",
      isPublished: true,
      isActive: true,
    }

    let relatedProducts = []

    // Primero: Productos de mismas categorías
    if (currentProduct.categories && currentProduct.categories.length > 0) {
      relatedProducts = await Product.find({
        ...relatedQuery,
        categories: { $in: currentProduct.categories },
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating lowStockThreshold allowBackorder trackQuantity")
        .populate("categories", "name slug")
        .limit(limit)
        .sort({ isFeatured: -1, salesCount: -1, createdAt: -1 })
        .lean()
    }

    // Segundo: Productos de misma marca
    if (relatedProducts.length < limit && currentProduct.brand) {
      const additional = await Product.find({
        ...relatedQuery,
        _id: { $nin: relatedProducts.map((p) => p._id) },
        brand: currentProduct.brand,
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating lowStockThreshold allowBackorder trackQuantity")
        .populate("categories", "name slug")
        .limit(limit - relatedProducts.length)
        .sort({ salesCount: -1, createdAt: -1 })
        .lean()

      relatedProducts = [...relatedProducts, ...additional]
    }

    // Tercero: Productos populares
    if (relatedProducts.length < limit) {
      const additional = await Product.find({
        ...relatedQuery,
        _id: { $nin: relatedProducts.map((p) => p._id) },
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating lowStockThreshold allowBackorder trackQuantity")
        .populate("categories", "name slug")
        .limit(limit - relatedProducts.length)
        .sort({ isFeatured: -1, salesCount: -1, rating: -1 })
        .lean()

      relatedProducts = [...relatedProducts, ...additional]
    }

    // ✅ Usar ProductCardDTO
    return relatedProducts.slice(0, limit).map(p => new ProductCardDTO(p))
  }

  /**
   * Buscar productos
   */
  async searchProducts(query, limit = 10) {
    if (!query || query.trim().length < 2) {
      throw ApiError.badRequest("El término de búsqueda debe tener al menos 2 caracteres")
    }

    const products = await Product.find({
      $text: { $search: query },
      status: "active",
      isPublished: true,
      isActive: true,
    })
      .select("name price comparePrice images slug shortDescription brand stock rating")
      .populate("categories", "name slug")
      .limit(limit)
      .lean()

    // ✅ Usar ProductCardDTO
    return products.map(p => new ProductCardDTO(p))
  }

  /**
   * Crear producto
   */
  async createProduct(productData, userId) {
    const product = await Product.create({
      ...productData,
      createdBy: userId,
    })

    return await this.getProductById(product._id)
  }

  /**
   * Actualizar producto
   */
  async updateProduct(productId, updateData, userId) {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        ...updateData,
        updatedBy: userId,
      },
      {
        new: true,
        runValidators: true,
      }
    )

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    return await this.getProductById(product._id)
  }

  /**
   * Eliminar producto (soft delete)
   */
  async deleteProduct(productId) {
    const product = await Product.findByIdAndUpdate(
      productId,
      { status: "archived" },
      { new: true }
    )

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    return product
  }

  /**
   * Verificar stock disponible
   */
  async checkStock(productId, quantity) {
    const product = await Product.findById(productId).select("stock trackQuantity allowBackorder")

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    if (!product.trackQuantity) {
      return {
        available: true,
        quantity: quantity,
        message: "Producto disponible (sin control de inventario)",
      }
    }

    if (product.stock >= quantity) {
      return {
        available: true,
        quantity: quantity,
        stock: product.stock,
        message: "Stock disponible",
      }
    }

    if (product.allowBackorder) {
      return {
        available: true,
        quantity: quantity,
        stock: product.stock,
        backorder: quantity - product.stock,
        message: "Disponible bajo pedido",
      }
    }

    return {
      available: false,
      quantity: quantity,
      stock: product.stock,
      message: "Stock insuficiente",
    }
  }

  /**
   * Obtener productos con stock bajo
   */
  async getLowStockProducts(threshold = null) {
    const query = {
      trackQuantity: true,
      status: "active",
    }

    if (threshold) {
      query.stock = { $lte: threshold }
    } else {
      query.$expr = { $lte: ["$stock", "$lowStockThreshold"] }
    }

    const products = await Product.find(query)
      .select("name slug sku stock lowStockThreshold price")
      .sort({ stock: 1 })
      .lean()

    return products
  }

  /**
   * Obtener productos más vendidos
   */
  async getTopSellingProducts(limit = 10) {
    const products = await Product.find({
      status: "active",
      isPublished: true,
      isActive: true,
    })
      .select("name price comparePrice images slug shortDescription brand stock rating salesCount")
      .populate("categories", "name slug")
      .limit(limit)
      .sort({ salesCount: -1, rating: -1 })
      .lean()

    // ✅ Usar ProductCardDTO
    return products.map(p => new ProductCardDTO(p))
  }

  /**
   * ✅ NUEVO - Obtener contexto SEO de un producto (reutilizable)
   */
  async getProductSEOContext(productId) {
    const product = await Product.findById(productId)
      .populate("mainCategory", "name slug")

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    const seoContext = await product.getSEOContext()
    return new ProductSEODTO(seoContext)
  }
}

module.exports = new ProductService()