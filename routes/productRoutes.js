const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts
} = require('../controllers/productController');
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview
} = require('../controllers/reviewController');
const { authMiddleware, requireRole } = require('../middleware/authMiddleware');

// Rutas públicas
router.get('/', getProducts);
router.get('/featured', getFeaturedProducts);
router.get('/search/:query', searchProducts);
router.get('/:slug', getProductBySlug);
router.get('/:productId/reviews', getProductReviews);

// Rutas protegidas - Reviews
router.post('/:productId/reviews', authMiddleware, createReview);
router.put('/reviews/:id', authMiddleware, updateReview);
router.delete('/reviews/:id', authMiddleware, deleteReview);

// Rutas de administrador
router.post('/', authMiddleware, requireRole(['admin', 'moderator']), createProduct);
router.put('/:id', authMiddleware, requireRole(['admin', 'moderator']), updateProduct);
router.delete('/:id', authMiddleware, requireRole(['admin']), deleteProduct);

module.exports = router;