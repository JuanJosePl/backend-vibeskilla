const Category = require("./category.model")
const Product = require("../products/product.model")
const ApiError = require("../../core/errors/ApiError")
const { CategoryListDTO, CategoryDetailDTO, CategoryTreeNodeDTO } = require('./category.dto');


/**
 * @class CategoryService
 * @description Servicio profesional de categorías con análisis y cache
 *
 * Responsabilidades:
 * - CRUD de categorías
 * - Validación de jerarquías
 * - Análisis y reporting
 * - SEO y optimización
 */
class CategoryService {
  /**
   * Obtener todas las categorías con filtros avanzados
   *
   * @param {Object} options - Opciones de filtrado
   * @returns {Promise<Array>} Categorías
   */
  async getCategories(options = {}) {
    const {
      includeInactive = false,
      includeDrafts = false,
      featured = false,
      parentOnly = false,
      withProductCount = false,
      sortBy = "order",
      page = 1,
      limit = 50,
    } = options

    // Construir query
    const query = { status: { $in: ["active"] } }

    if (includeInactive) {
      query.status = { $in: ["active", "archived"] }
    }
    if (includeDrafts) {
      query.status = { $in: ["active", "archived", "draft"] }
    }
    if (featured) {
      query.featured = true
    }
    if (parentOnly) {
      query.parentCategory = null
    }

    // Ordenamiento
    const sortOptions = {
      order: { order: 1, name: 1 },
      newest: { createdAt: -1 },
      views: { views: -1 },
      name: { name: 1 },
      productCount: { productCount: -1 },
    }

    const sort = sortOptions[sortBy] || sortOptions["order"]

    // Paginación
    const skip = (page - 1) * limit

    let categories = await Category.find(query)
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .populate("parentCategory", "name slug")
      .lean()

    // Agregar conteo de productos si se solicita
    if (withProductCount) {
      categories = await Promise.all(
        categories.map(async (cat) => {
          const count = await Product.countDocuments({
            categories: cat._id,
            status: "active",
            isPublished: true,
          })
          return { ...cat, productCount: count }
        }),
      )
    }

    // ✅ Usar DTO
    const dtoCategories = categories.map(
      (cat) => new CategoryListDTO(cat),
    )

    // Total para paginación
    const total = await Category.countDocuments(query)

    return {
      data: dtoCategories,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    }
  }

  /**
   * Obtener categoría por slug con análisis
   *
   * @param {string} slug - Slug de la categoría
   * @returns {Promise<Object>} Categoría con análisis
   */
  async getCategoryBySlug(slug) {
    const category = await Category.findOne({
      slug,
      status: { $in: ["active", "draft"] },
      isPublished: true,
    }).populate("parentCategory", "name slug");

    if (!category) {
      throw ApiError.notFound("Categoría no encontrada");
    }

    // Incrementar vistas de forma asíncrona
    category.incrementViews().catch(err =>
      console.error("[CategoryService] Error incrementing views:", err)
    );

    // Obtener subcategorías
    const subcategories = await Category.find({
      parentCategory: category._id,
      status: "active",
      isPublished: true,
    })
      .select("name slug images.thumbnail order productCount")
      .sort({ order: 1, name: 1 })
      .lean();

    // Obtener breadcrumb
    const breadcrumb = await category.getBreadcrumb();

    // ✅ Contar productos EN TIEMPO REAL
    const productCount = await Product.countDocuments({
      categories: category._id,
      status: "active",
      isPublished: true,
    });

    // ✅ Usar DTO con datos extras
    const dto = new CategoryDetailDTO(category, {
      subcategories: subcategories.map(sub => new CategoryListDTO(sub)),
      breadcrumb,
      productCount
    });

    return dto;
  }

  /**
   * Obtener categoría por ID
   *
   * @param {string} categoryId - ID de la categoría
   * @returns {Promise<Object>} Categoría
   */
  async getCategoryById(categoryId) {
    const category = await Category.findById(categoryId)
      .populate("parentCategory", "name slug")
      .populate("createdBy updatedBy", "name email")

    if (!category) {
      throw ApiError.notFound("Categoría no encontrada")
    }

    return category
  }

  /**
   * Crear categoría con validaciones
   *
   * @param {Object} categoryData - Datos de la categoría
   * @param {string} userId - ID del usuario creador
   * @returns {Promise<Object>} Categoría creada
   */
  async createCategory(categoryData, userId) {
    const {
      name,
      description,
      parentCategory,
      images,
      seo,
      featured,
      isActive,
      status,
      order,
    } = categoryData;

    // Validar categoría padre
    if (parentCategory) {
      const parent = await Category.findById(parentCategory);
      if (!parent) {
        throw ApiError.badRequest("La categoría padre no existe");
      }
    }

    // Nombre único
    const exists = await Category.findOne({ name });
    if (exists) {
      throw ApiError.conflict(`La categoría "${name}" ya existe`);
    }

    // ✅ NO enviar slug, dejar que el pre-save lo genere
    const category = await Category.create({
      name,
      // slug: NO ENVIAR, el pre-save lo genera
      description,
      parentCategory: parentCategory || null,
      images: images || {},
      seo: seo || {},
      featured: featured ?? false,
      isActive: isActive ?? true,
      status: status ?? "active",
      order: order ?? 0,
      createdBy: userId,
    });

    return category.populate("parentCategory", "name slug");
  }


  /**
   * Actualizar categoría
   *
   * @param {string} categoryId - ID de la categoría
   * @param {Object} updateData - Datos a actualizar
   * @param {string} userId - ID del usuario que actualiza
   * @returns {Promise<Object>} Categoría actualizada
   */
  /**
 * Actualizar categoría
 */
  async updateCategory(categoryId, updateData, userId) {
    const { name, slug, parentCategory } = updateData

    // Validar categoría padre si se actualiza
    if (parentCategory !== undefined) {
      if (parentCategory && parentCategory.toString() !== categoryId.toString()) {
        const parent = await Category.findById(parentCategory)
        if (!parent) {
          throw ApiError.badRequest("La categoría padre no existe")
        }

        if (await this._checkCircularReference(categoryId, parentCategory)) {
          throw ApiError.badRequest("Referencia circular detectada")
        }
      }
    }

    // Validar nombre único
    if (name) {
      const existing = await Category.findOne({
        name,
        _id: { $ne: categoryId },
      })
      if (existing) {
        throw ApiError.conflict(`La categoría "${name}" ya existe`)
      }
    }

    // Validar slug único si se actualiza
    if (slug) {
      const existingSlug = await Category.findOne({
        slug,
        _id: { $ne: categoryId },
      })
      if (existingSlug) {
        throw ApiError.conflict(`El slug "${slug}" ya existe`)
      }
    }

    const category = await Category.findByIdAndUpdate(
      categoryId,
      {
        ...updateData,
        updatedBy: userId,
      },
      {
        new: true,
        runValidators: true,
      }
    ).populate("parentCategory", "name slug")

    if (!category) {
      throw ApiError.notFound("Categoría no encontrada")
    }

    return category
  }


  /**
   * Eliminar categoría (soft delete)
   *
   * @param {string} categoryId - ID de la categoría
   * @returns {Promise<void>}
   */
  async deleteCategory(categoryId) {
    // Verificar subcategorías
    const hasSubcategories = await Category.exists({
      parentCategory: categoryId,
      status: { $ne: "archived" },
    })
    if (hasSubcategories) {
      throw ApiError.badRequest("No se puede eliminar una categoría con subcategorías activas")
    }

    // Verificar productos
    const hasProducts = await Product.exists({ categories: categoryId })
    if (hasProducts) {
      throw ApiError.badRequest("No se puede eliminar una categoría con productos asociados")
    }

    const category = await Category.findByIdAndUpdate(categoryId, { status: "archived" }, { new: true })

    if (!category) {
      throw ApiError.notFound("Categoría no encontrada")
    }

    return category
  }

  /**
   * Obtener árbol jerárquico de categorías
   *
   * @returns {Promise<Array>} Árbol de categorías
   */
  async getCategoryTree() {
    const categories = await Category.find({
      status: "active",
      isPublished: true,
    })
      .select("name slug parentCategory order productCount images.thumbnail")
      .sort({ order: 1, name: 1 })
      .lean();

    const buildTree = (parentId = null) => {
      return categories
        .filter((cat) => {
          const catParentId = cat.parentCategory?.toString();
          return parentId === null
            ? !catParentId
            : catParentId === parentId.toString();
        })
        .map((cat) => {
          const children = buildTree(cat._id);
          return new CategoryTreeNodeDTO(cat, children);
        });
    };

    return buildTree();
  }

  /**
   * Obtener categorías destacadas
   *
   * @param {number} limit - Límite de categorías
   * @returns {Promise<Array>} Categorías destacadas
   */
  async getFeaturedCategories(limit = 6) {
    return await Category.find({
      featured: true,
      status: "active",
      isPublished: true,
    })
      .select("name slug images.thumbnail images.hero productCount")
      .limit(limit)
      .sort({ order: 1 })
      .lean()
  }

  /**
   * Buscar categorías por nombre o keywords
   *
   * @param {string} query - Término de búsqueda
   * @returns {Promise<Array>} Categorías encontradas
   */
  async searchCategories(query) {
    if (!query || query.length < 2) {
      throw ApiError.badRequest("El término de búsqueda debe tener al menos 2 caracteres")
    }

    return await Category.find({
      $or: [
        { name: { $regex: query, $options: "i" } },
        { description: { $regex: query, $options: "i" } },
        { "seo.keywords": { $regex: query, $options: "i" } },
      ],
      status: "active",
    })
      .select("name slug images.thumbnail")
      .limit(20)
      .lean()
  }

  /**
   * Obtener categorías más populares
   *
   * @param {number} limit - Límite
   * @returns {Promise<Array>} Categorías por popularidad
   */
  async getPopularCategories(limit = 10) {
    return await Category.find({
      status: "active",
      isPublished: true,
    })
      .sort({ views: -1, productCount: -1 })
      .limit(limit)
      .select("name slug views productCount")
      .lean()
  }

  /**
   * Validar referencia circular
   *
   * @private
   * @param {string} categoryId - ID de la categoría
   * @param {string} parentId - ID del padre
   * @returns {Promise<boolean>}
   */
  async _checkCircularReference(categoryId, parentId) {
    let current = parentId
    const maxIterations = 100
    let iterations = 0

    while (current && iterations < maxIterations) {
      if (current.toString() === categoryId?.toString()) {
        return true
      }

      const parent = await Category.findById(current).select("parentCategory")
      current = parent?.parentCategory
      iterations++
    }

    return false
  }
}

module.exports = new CategoryService()
