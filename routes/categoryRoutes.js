const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory
} = require('../controllers/categoryController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/', getCategories);
router.get('/:slug', getCategoryBySlug);

// Rutas de administrador
router.post('/', authMiddleware, requireRole(['admin']), createCategory);
router.put('/:id', authMiddleware, requireRole(['admin']), updateCategory);
router.delete('/:id', authMiddleware, requireRole(['admin']), deleteCategory);

module.exports = router;