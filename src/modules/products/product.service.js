const Product = require("./product.model")
const Category = require("../categories/category.model")
const ApiError = require("../../core/errors/ApiError")

/**
 * @class ProductService
 * @description Lógica de negocio para productos
 */
class ProductService {
  /**
   * Obtener productos con filtros avanzados y paginación
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

    return {
      products,
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
   * Obtener producto por slug
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

    Product.findByIdAndUpdate(product._id, { $inc: { views: 1 }, lastViewedAt: new Date() }, { new: false }).exec()

    return product
  }

  /**
   * ✅ CORREGIDO - Obtener producto por ID
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
   * Obtener productos destacados
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

    return products
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

    if (currentProduct.categories && currentProduct.categories.length > 0) {
      relatedProducts = await Product.find({
        ...relatedQuery,
        categories: { $in: currentProduct.categories },
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating")
        .populate("categories", "name slug")
        .limit(limit)
        .sort({ isFeatured: -1, salesCount: -1, createdAt: -1 })
        .lean()
    }

    if (relatedProducts.length < limit && currentProduct.brand) {
      const additional = await Product.find({
        ...relatedQuery,
        _id: { $nin: relatedProducts.map((p) => p._id) },
        brand: currentProduct.brand,
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating")
        .populate("categories", "name slug")
        .limit(limit - relatedProducts.length)
        .sort({ salesCount: -1, createdAt: -1 })
        .lean()

      relatedProducts = [...relatedProducts, ...additional]
    }

    if (relatedProducts.length < limit) {
      const additional = await Product.find({
        ...relatedQuery,
        _id: { $nin: relatedProducts.map((p) => p._id) },
      })
        .select("name price comparePrice images slug shortDescription isFeatured brand stock rating")
        .populate("categories", "name slug")
        .limit(limit - relatedProducts.length)
        .sort({ isFeatured: -1, salesCount: -1, rating: -1 })
        .lean()

      relatedProducts = [...relatedProducts, ...additional]
    }

    return relatedProducts.slice(0, limit)
  }

  /**
   * Buscar productos con full-text search
   */
  async searchProducts(searchQuery, limit = 10, filters = {}) {
    if (!searchQuery || searchQuery.trim().length === 0) {
      throw ApiError.badRequest("El término de búsqueda es requerido")
    }

    const query = {
      status: "active",
      isPublished: true,
      isActive: true,
      $text: { $search: searchQuery },
    }

    if (filters.category) {
      const category = await Category.findOne({ slug: filters.category })
      if (category) query.categories = category._id
    }

    if (filters.minPrice || filters.maxPrice) {
      query.price = {}
      if (filters.minPrice) query.price.$gte = Number(filters.minPrice)
      if (filters.maxPrice) query.price.$lte = Number(filters.maxPrice)
    }

    const products = await Product.find(query)
      .select("name slug price comparePrice images brand shortDescription rating isFeatured")
      .populate("categories", "name slug")
      .limit(Number.parseInt(limit))
      .sort({ score: { $meta: "textScore" }, isFeatured: -1, salesCount: -1 })
      .lean()

    return products
  }

  /**
   * ✅✅✅ CRÍTICO - CREAR PRODUCTO CORREGIDO
   */
  async createProduct(productData, userId) {
    console.log("📥 ProductService.createProduct - Datos recibidos:", JSON.stringify(productData, null, 2))

    // ===============================
    // 1️⃣ CONSTRUIR PAYLOAD LIMPIO
    // ===============================
    const cleanData = {
      // Básico
      name: productData.name?.trim() || "",
      slug: productData.slug || "",
      description: productData.description?.trim() || "",
      shortDescription: productData.shortDescription?.trim() || "", // ✅ INCLUIDO

      // Precios
      price: Number.parseFloat(productData.price) || 0,
      comparePrice: productData.comparePrice ? Number.parseFloat(productData.comparePrice) : undefined,
      costPrice: productData.costPrice ? Number.parseFloat(productData.costPrice) : undefined,

      // Inventario
      stock: Number.parseInt(productData.stock) || 0,
      sku: productData.sku?.trim() || "",
      trackQuantity: productData.trackQuantity !== undefined ? productData.trackQuantity : true,
      allowBackorder: productData.allowBackorder !== undefined ? productData.allowBackorder : false,
      lowStockThreshold: productData.lowStockThreshold || 5,

      // Categorías
      categories: Array.isArray(productData.categories) ? productData.categories : [],
      mainCategory: productData.mainCategory && productData.mainCategory.trim() !== "" ? productData.mainCategory : undefined,

      // Marca y Tags
      brand: productData.brand?.trim() || "",
      tags: Array.isArray(productData.tags) ? productData.tags.map((t) => t.toLowerCase().trim()) : [],

      // Imágenes
      images: Array.isArray(productData.images) ? productData.images : [],

      // ✅✅✅ ATRIBUTOS - CRÍTICO
      attributes: {
        size: Array.isArray(productData.attributes?.size) ? productData.attributes.size : [],
        color: Array.isArray(productData.attributes?.color) ? productData.attributes.color : [],
        material: Array.isArray(productData.attributes?.material) ? productData.attributes.material : [],
        weight: productData.attributes?.weight || null,
        dimensions: {
          length: Number(productData.attributes?.dimensions?.length) || 0,
          width: Number(productData.attributes?.dimensions?.width) || 0,
          height: Number(productData.attributes?.dimensions?.height) || 0,
          unit: productData.attributes?.dimensions?.unit || "cm",
        },
      },

      // ✅✅✅ SEO - CRÍTICO
      seo: {
        title: productData.seo?.title || "",
        description: productData.seo?.description || "",
        metaKeywords: Array.isArray(productData.seo?.metaKeywords) ? productData.seo.metaKeywords : [],
        canonicalUrl: productData.seo?.canonicalUrl || undefined,
      },

      // ✅✅✅ WEIGHT SEPARADO - CRÍTICO
      weight: {
        value: productData.weight?.value ? Number(productData.weight.value) : undefined,
        unit: productData.weight?.unit || "kg",
      },

      // Estados
      status: productData.status || "active",
      visibility: productData.visibility || "public",
      isActive: Boolean(productData.isActive),
      isFeatured: Boolean(productData.isFeatured),
      isPublished: Boolean(productData.isPublished),
      requiresShipping: productData.requiresShipping !== undefined ? productData.requiresShipping : true,

      // Auditoría
      createdBy: userId,
    }

    // ===============================
    // 2️⃣ LIMPIAR undefined
    // ===============================
    Object.keys(cleanData).forEach((key) => {
      if (cleanData[key] === undefined) {
        delete cleanData[key]
      }
    })

    console.log("✅ ProductService.createProduct - Datos limpios a guardar:", JSON.stringify(cleanData, null, 2))

    // ===============================
    // 3️⃣ CREAR PRODUCTO
    // ===============================
    const product = await Product.create(cleanData)

    console.log("💾 Producto creado en DB:", JSON.stringify(product, null, 2))

    return product
  }

  /**
   * ✅ CORREGIDO - Actualizar producto
   */
  async updateProduct(productId, updateData, userId) {
    const product = await Product.findById(productId)
    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    // Validar precios
    if (updateData.price && updateData.comparePrice && updateData.comparePrice < updateData.price) {
      throw ApiError.badRequest("El precio de comparación debe ser mayor que el precio")
    }

    if (updateData.costPrice && updateData.price && updateData.costPrice > updateData.price) {
      throw ApiError.badRequest("El precio de costo debe ser menor que el precio de venta")
    }

    // ✅ CONSTRUIR PAYLOAD COMPLETO
    const cleanData = {
      ...updateData,
      updatedBy: userId,
    }

    // Normalizar números
    if (updateData.price !== undefined) cleanData.price = Number.parseFloat(updateData.price)
    if (updateData.comparePrice !== undefined) cleanData.comparePrice = Number.parseFloat(updateData.comparePrice)
    if (updateData.costPrice !== undefined) cleanData.costPrice = Number.parseFloat(updateData.costPrice)
    if (updateData.stock !== undefined) cleanData.stock = Number.parseInt(updateData.stock)

    // Normalizar tags
    if (updateData.tags) {
      cleanData.tags = updateData.tags.map((t) => t.toLowerCase().trim())
    }

    // ✅ CRÍTICO: Solo eliminar undefined, NO eliminar false o 0
    Object.keys(cleanData).forEach((key) => {
      if (cleanData[key] === undefined) {
        delete cleanData[key]
      }
    })

    const updated = await Product.findByIdAndUpdate(productId, cleanData, { new: true, runValidators: true })
      .populate("categories", "name slug")
      .populate("mainCategory", "name slug")

    return updated
  }

  /**
   * Archivar producto (soft delete)
   */
  async deleteProduct(productId) {
    const product = await Product.findByIdAndUpdate(
      productId,
      {
        status: "archived",
        isPublished: false,
        isActive: false,
      },
      { new: true }
    )

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    return product
  }

  /**
   * Verificar disponibilidad de stock
   */
  async checkStock(productId, quantity) {
    const product = await Product.findById(productId)

    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    if (!product.isAvailable()) {
      throw ApiError.conflict("El producto no está disponible")
    }

    if (product.trackQuantity && !product.allowBackorder && product.stock < quantity) {
      throw ApiError.conflict(`Stock insuficiente. Disponibles: ${product.stock}`)
    }

    return {
      available: true,
      stock: product.stock,
      allowBackorder: product.allowBackorder,
    }
  }

  /**
   * Obtener productos por categoría
   */
  async getProductsByCategory(categorySlug, filters = {}) {
    const category = await Category.findOne({ slug: categorySlug })
    if (!category) {
      throw ApiError.notFound("Categoría no encontrada")
    }

    return await this.getProducts({
      ...filters,
      category: category._id,
    })
  }

  /**
   * Obtener productos en stock bajo
   */
  async getLowStockProducts(threshold = null) {
    const query = {
      status: "active",
      trackQuantity: true,
      isActive: true,
    }

    if (threshold) {
      query.stock = { $lte: threshold }
    } else {
      query.$expr = { $lte: ["$stock", "$lowStockThreshold"] }
    }

    const products = await Product.find(query)
      .select("name sku stock lowStockThreshold price")
      .populate("categories", "name")
      .sort({ stock: 1 })
      .lean()

    return products
  }

  /**
   * Obtener productos más vendidos
   */
  async getTopSellingProducts(limit = 10, period = "all") {
    const query = { status: "active", isPublished: true }

    const products = await Product.find(query)
      .select("name slug images price salesCount rating")
      .populate("categories", "name slug")
      .limit(limit)
      .sort({ salesCount: -1 })
      .lean()

    return products
  }

  /**
   * Obtener productos por tags
   */
  async getProductsByTag(tag, limit = 12, page = 1) {
    const skip = (page - 1) * limit

    const [products, total] = await Promise.all([
      Product.find({
        tags: tag,
        status: "active",
        isPublished: true,
        isActive: true,
      })
        .limit(limit)
        .skip(skip)
        .populate("categories", "name slug")
        .lean(),
      Product.countDocuments({
        tags: tag,
        status: "active",
        isPublished: true,
        isActive: true,
      }),
    ])

    return {
      products,
      pagination: {
        current: page,
        pages: Math.ceil(total / limit),
        total,
      },
    }
  }
}

module.exports = new ProductService()