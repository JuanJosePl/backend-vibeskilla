const express = require("express")
const router = express.Router()
const productController = require("./product.controller")
const {
  validate,
  createProductValidation,
  updateProductValidation,
  getProductsValidation,
  slugValidation,
  idValidation,
  checkStockValidation,
} = require("./product.validation")
const { authMiddleware, requireRole } = require("../../middleware/auth")

/**
 * ==========================================
 * RUTAS PÚBLICAS
 * ==========================================
 * IMPORTANTE: Rutas específicas ANTES de /:slug
 * para evitar que Express las interprete como slug
 */

// GET /api/products - Obtener productos con filtros y paginación
router.get("/", validate(getProductsValidation), productController.getProducts)

// GET /api/products/featured - Obtener productos destacados
// ⚠️ DEBE estar ANTES de /:slug
router.get("/featured", productController.getFeaturedProducts)

// GET /api/products/top-selling - Obtener productos más vendidos
// ⚠️ DEBE estar ANTES de /:slug
router.get("/top-selling", productController.getTopSellingProducts)

// GET /api/products/search/:query - Buscar productos
// ⚠️ DEBE estar ANTES de /:slug
router.get("/search/:query", productController.searchProducts)

// GET /api/products/category/:categorySlug - Productos por categoría
// ⚠️ DEBE estar ANTES de /:slug
router.get("/category/:categorySlug", productController.getProductsByCategory)

// GET /api/products/related/:productId - Productos relacionados
// ⚠️ DEBE estar ANTES de /:slug
router.get("/related/:productId", validate(idValidation), productController.getRelatedProducts)

// POST /api/products/check-stock/:productId - Verificar stock
router.post("/check-stock/:productId", validate(checkStockValidation), productController.checkStock)

/**
 * ==========================================
 * RUTA DINÁMICA /:slug
 * ==========================================
 * ⚠️ IMPORTANTE: Esta ruta debe estar AL FINAL
 * de todas las rutas públicas para evitar conflictos
 */

// GET /api/products/:slug - Obtener producto por slug
router.get("/:slug", validate(slugValidation), productController.getProductBySlug)

/**
 * ==========================================
 * RUTAS PROTEGIDAS - ADMIN/MODERATOR
 * ==========================================
 */

// GET /api/products/admin/low-stock - Productos con stock bajo
// ⚠️ Esta ruta debe estar ANTES de las rutas con :id para evitar conflictos
router.get("/admin/low-stock", authMiddleware, requireRole("admin"), productController.getLowStockProducts)

// POST /api/products - Crear producto
router.post(
  "/",
  authMiddleware,
  requireRole("admin", "moderator"),
  validate(createProductValidation),
  productController.createProduct,
)

// PUT /api/products/:id - Actualizar producto
router.put(
  "/:id",
  authMiddleware,
  requireRole("admin", "moderator"),
  validate(updateProductValidation),
  productController.updateProduct,
)

// DELETE /api/products/:id - Archivar producto
router.delete("/:id", authMiddleware, requireRole("admin"), validate(idValidation), productController.deleteProduct)

module.exports = router