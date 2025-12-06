const categoryService = require("./category.service")
const catchAsync = require("../../core/utils/catchAsync")
const ApiError = require("../../core/errors/ApiError")

/**
 * @class CategoryController
 * @description Controlador ultra delgado para CATEGORIES
 */

/**
 * GET /api/categories
 * @desc Obtener todas las categorías con filtros
 */
const getCategories = catchAsync(async (req, res) => {
  const { featured, parentOnly, withProductCount, sortBy, page = 1, limit = 50 } = req.query

  const options = {
    featured: featured === "true",
    parentOnly: parentOnly === "true",
    withProductCount: withProductCount === "true",
    sortBy: sortBy || "order",
    page: Math.max(1, Number.parseInt(page)),
    limit: Math.min(100, Number.parseInt(limit)),
  }

  const result = await categoryService.getCategories(options)

  res.json({
    success: true,
    count: result.data.length,
    pagination: result.pagination,
    data: result.data,
  })
})

/**
 * GET /api/categories/tree
 * @desc Obtener árbol jerárquico de categorías
 */
const getCategoryTree = catchAsync(async (req, res) => {
  const tree = await categoryService.getCategoryTree()

  res.json({
    success: true,
    data: tree,
  })
})

/**
 * GET /api/categories/featured
 * @desc Obtener categorías destacadas
 */
const getFeaturedCategories = catchAsync(async (req, res) => {
  const { limit = 6 } = req.query
  const categories = await categoryService.getFeaturedCategories(Number.parseInt(limit))

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  })
})

/**
 * GET /api/categories/popular
 * @desc Obtener categorías más populares
 */
const getPopularCategories = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query
  const categories = await categoryService.getPopularCategories(Number.parseInt(limit))

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  })
})

/**
 * GET /api/categories/search
 * @desc Buscar categorías
 */
const searchCategories = catchAsync(async (req, res) => {
  const { q } = req.query

  if (!q) {
    throw ApiError.badRequest("Parámetro de búsqueda requerido: q")
  }

  const categories = await categoryService.searchCategories(q)

  res.json({
    success: true,
    count: categories.length,
    data: categories,
  })
})

/**
 * GET /api/categories/:slug
 * @desc Obtener categoría por slug
 */
const getCategoryBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params
  const category = await categoryService.getCategoryBySlug(slug)

  res.json({
    success: true,
    data: category,
  })
})

/**
 * POST /api/categories
 * @desc Crear nueva categoría (ADMIN)
 */
const createCategory = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const category = await categoryService.createCategory(req.body, req.user._id)

  res.status(201).json({
    success: true,
    message: "Categoría creada exitosamente",
    data: category,
  })
})

/**
 * PUT /api/categories/:id
 * @desc Actualizar categoría (ADMIN)
 */
const updateCategory = catchAsync(async (req, res) => {
  const { id } = req.params

  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const category = await categoryService.updateCategory(id, req.body, req.user._id)

  res.json({
    success: true,
    message: "Categoría actualizada exitosamente",
    data: category,
  })
})

/**
 * DELETE /api/categories/:id
 * @desc Eliminar categoría (ADMIN)
 */
const deleteCategory = catchAsync(async (req, res) => {
  const { id } = req.params
  await categoryService.deleteCategory(id)

  res.json({
    success: true,
    message: "Categoría eliminada exitosamente",
  })
})

module.exports = {
  getCategories,
  getCategoryTree,
  getFeaturedCategories,
  getPopularCategories,
  searchCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
}
