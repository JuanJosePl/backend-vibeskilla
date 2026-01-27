const productService = require("./product.service");
const catchAsync = require("../../core/utils/catchAsync");
const ApiError = require("../../core/errors/ApiError");

/**
 * @class ProductController
 * @description Controlador delgado para PRODUCTS
 * Responsabilidad: Recibir requests, validar, llamar service, retornar respuestas
 */

const getProducts = catchAsync(async (req, res) => {
  const result = await productService.getProducts(req.query);

  res.json({
    success: true,
    message: "Productos obtenidos exitosamente",
    data: result.products,
    pagination: result.pagination,
  });
});

const getProductBySlug = catchAsync(async (req, res) => {
  const { slug } = req.params;
  const product = await productService.getProductBySlug(slug);

  res.json({
    success: true,
    data: product,
  });
});

const getProductById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const product = await productService.getProductById(id);

  res.json({
    success: true,
    data: product,
  });
});

const getFeaturedProducts = catchAsync(async (req, res) => {
  const { limit = 8 } = req.query;
  const products = await productService.getFeaturedProducts(
    Number.parseInt(limit)
  );

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

const getRelatedProducts = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { limit = 4 } = req.query;
  const products = await productService.getRelatedProducts(productId, {
    limit,
  });

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

const searchProducts = catchAsync(async (req, res) => {
  const { query } = req.params;
  const { limit = 10 } = req.query;

  if (!query || query.trim().length < 2) {
    throw ApiError.badRequest(
      "El término de búsqueda debe tener al menos 2 caracteres"
    );
  }

  const products = await productService.searchProducts(query, limit);

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

const createProduct = catchAsync(async (req, res) => {
  if (!req.user || !req.user._id) {
    throw ApiError.unauthorized("Usuario no autenticado");
  }

  const product = await productService.createProduct(req.body, req.user._id);

  res.status(201).json({
    success: true,
    message: "Producto creado exitosamente",
    data: product,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  if (!req.user || !req.user._id) {
    throw ApiError.unauthorized("Usuario no autenticado");
  }

  const product = await productService.updateProduct(
    id,
    req.body,
    req.user._id
  );

  res.json({
    success: true,
    message: "Producto actualizado exitosamente",
    data: product,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const { id } = req.params;

  await productService.deleteProduct(id);

  res.json({
    success: true,
    message: "Producto archivado exitosamente",
  });
});

const checkStock = catchAsync(async (req, res) => {
  const { productId } = req.params;
  const { quantity } = req.body;

  const stock = await productService.checkStock(productId, quantity);

  res.json({
    success: true,
    data: stock,
  });
});

const getProductsByCategory = catchAsync(async (req, res) => {
  const { categorySlug } = req.params;
  const result = await productService.getProductsByCategory(
    categorySlug,
    req.query
  );

  res.json({
    success: true,
    data: result.products,
    pagination: result.pagination,
  });
});

const getLowStockProducts = catchAsync(async (req, res) => {
  if (!req.user || req.user.role !== "admin") {
    throw ApiError.forbidden("Solo administradores pueden acceder a esta ruta");
  }

  const { threshold } = req.query;
  const products = await productService.getLowStockProducts(
    threshold ? Number.parseInt(threshold) : null
  );

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

const getTopSellingProducts = catchAsync(async (req, res) => {
  const { limit = 10 } = req.query;
  const products = await productService.getTopSellingProducts(
    Number.parseInt(limit)
  );

  res.json({
    success: true,
    count: products.length,
    data: products,
  });
});

/**
 * ✅ NUEVO - GET /api/products/:id/seo
 * @desc Obtener contexto SEO de un producto (reutilizable)
 */
const getProductSEOContext = catchAsync(async (req, res) => {
  const { id } = req.params;
  const seoContext = await productService.getProductSEOContext(id);

  res.json({
    success: true,
    data: seoContext,
  });
});

module.exports = {
  getProducts,
  getProductBySlug,
  getProductById,
  getFeaturedProducts,
  getRelatedProducts,
  searchProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  checkStock,
  getProductsByCategory,
  getLowStockProducts,
  getTopSellingProducts,
  getProductSEOContext,
};