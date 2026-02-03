const express = require('express');
const router = express.Router();
const wishlistController = require('./wishlist.controller');
const { authMiddleware } = require('../../middleware/auth');
const { validate, addItemValidation, removeItemValidation } = require('./wishlist.validation');

/**
 * Todas las rutas requieren autenticación
 */
router.use(authMiddleware);

/**
 * @route   GET /api/wishlist
 * @desc    Obtener wishlist del usuario actual
 * @access  Private
 */
router.get('/', wishlistController.getWishlist);

/**
 * @route   POST /api/wishlist/items
 * @desc    Agregar producto a wishlist
 * @access  Private
 */
router.post(
  '/items',
  validate(addItemValidation),
  wishlistController.addItem
);

/**
 * @route   DELETE /api/wishlist/items/:productId
 * @desc    Eliminar producto de wishlist
 * @access  Private
 */
router.delete(
  '/items/:productId',
  validate(removeItemValidation),
  wishlistController.removeItem
);

/**
 * @route   DELETE /api/wishlist
 * @desc    Limpiar toda la wishlist
 * @access  Private
 */
router.delete('/', wishlistController.clearWishlist);

/**
 * @route   GET /api/wishlist/check/:productId
 * @desc    Verificar si producto está en wishlist
 * @access  Private
 */
router.get('/check/:productId', wishlistController.checkProduct);

/**
 * @route   POST /api/wishlist/move-to-cart
 * @desc    Mover productos a carrito
 * @access  Private
 */
router.post('/move-to-cart', wishlistController.moveToCart);

/**
 * @route   GET /api/wishlist/price-changes
 * @desc    Obtener productos con cambios de precio
 * @access  Private
 */
router.get('/price-changes', wishlistController.getPriceChanges);

/**
 * @route   POST /api/wishlist/sync
 * @desc    Sincronizar wishlist guest → user
 * @access  Private
 */
router.post('/sync', wishlistController.syncGuestWishlist );


module.exports = router;