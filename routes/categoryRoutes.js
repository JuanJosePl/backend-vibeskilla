const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getRelatedProducts
} = require('../controllers/categoryController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);
// GET /api/products/related/:productId
router.get('/related/:productId', getRelatedProducts);

// Rutas de administrador
router.post('/', authMiddleware, requireRole(['admin']), createCategory);
router.put('/:id', authMiddleware, requireRole(['admin']), updateCategory);
router.delete('/:id', authMiddleware, requireRole(['admin']), deleteCategory);

module.exports = router;