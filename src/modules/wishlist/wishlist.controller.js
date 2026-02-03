const wishlistService = require('./wishlist.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class WishlistController
 * @description Controlador ultra delgado para WISHLIST
 * 
 * Responsabilidades:
 * - Recibir req/res
 * - Delegar al service
 * - Formatear respuesta
 */

/**
 * @desc    Obtener wishlist del usuario
 * @route   GET /api/wishlist
 * @access  Private
 */
const getWishlist = catchAsync(async (req, res) => {
  const wishlist = await wishlistService.getOrCreateWishlist(req.user._id);

  res.json({
    success: true,
    data: wishlist
  });
});

/**
 * @desc    Agregar producto a wishlist
 * @route   POST /api/wishlist/items
 * @access  Private
 */
const addItem = catchAsync(async (req, res) => {
  const { productId, notifyPriceChange, notifyAvailability } = req.body;

  const wishlist = await wishlistService.addItem(
    req.user._id,
    productId,
    { notifyPriceChange, notifyAvailability }
  );

  res.status(201).json({
    success: true,
    message: 'Producto agregado a tu lista de deseos',
    data: wishlist
  });
});

/**
 * @desc    Eliminar producto de wishlist
 * @route   DELETE /api/wishlist/items/:productId
 * @access  Private
 */
const removeItem = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const wishlist = await wishlistService.removeItem(req.user._id, productId);

  res.json({
    success: true,
    message: 'Producto eliminado de tu lista de deseos',
    data: wishlist
  });
});

/**
 * @desc    Limpiar toda la wishlist
 * @route   DELETE /api/wishlist
 * @access  Private
 */
const clearWishlist = catchAsync(async (req, res) => {
  const wishlist = await wishlistService.clearWishlist(req.user._id);

  res.json({
    success: true,
    message: 'Lista de deseos vaciada',
    data: wishlist
  });
});

/**
 * @desc    Verificar si producto está en wishlist
 * @route   GET /api/wishlist/check/:productId
 * @access  Private
 */
const checkProduct = catchAsync(async (req, res) => {
  const { productId } = req.params;

  const exists = await wishlistService.hasProduct(req.user._id, productId);

  res.json({
    success: true,
    inWishlist: exists
  });
});

/**
 * @desc    Mover productos a carrito
 * @route   POST /api/wishlist/move-to-cart
 * @access  Private
 */
const moveToCart = catchAsync(async (req, res) => {
  const { productIds } = req.body;

  const result = await wishlistService.moveToCart(req.user._id, productIds);

  res.json({
    success: true,
    message: `${result.movedCount} productos movidos al carrito`,
    data: result
  });
});

/**
 * @desc    Obtener productos con cambios de precio
 * @route   GET /api/wishlist/price-changes
 * @access  Private
 */
const getPriceChanges = catchAsync(async (req, res) => {
  const changes = await wishlistService.getPriceChanges(req.user._id);

  res.json({
    success: true,
    count: changes.length,
    data: changes
  });
});

/**
 * @desc    Sincronizar wishlist guest → user
 * @route   POST /api/wishlist/sync
 * @access  Private
 */
const syncGuestWishlist  = catchAsync(async (req, res) => {
  const { items } = req.body;

  const result = await wishlistService.syncGuestWishlist(
    req.user._id,
    items
  );

  res.json({
    success: true,
    message: 'Wishlist sincronizada correctamente',
    migratedCount: result.migratedCount
  });
});



module.exports = {
  getWishlist,
  addItem,
  removeItem,
  clearWishlist,
  checkProduct,
  moveToCart,
  getPriceChanges,
  syncGuestWishlist  
};