const cartService = require("./cart.service")
const catchAsync = require("../../core/utils/catchAsync")
const ApiError = require("../../core/errors/ApiError")

/**
 * GET /api/cart
 * @desc Obtener carrito del usuario
 */
const getCart = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const cart = await cartService.getOrCreateCart(req.user._id)

  res.json({
    success: true,
    data: cart,
  })
})

/**
 * POST /api/cart/items
 * @desc Agregar item al carrito
 */
const addToCart = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const cart = await cartService.addItem(req.user._id, req.body)

  res.status(201).json({
    success: true,
    message: "Producto agregado al carrito",
    data: cart,
  })
})

/**
 * PUT /api/cart/items/:productId
 * @desc Actualizar cantidad de item
 */
const updateCartItem = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const { productId } = req.params
  const cart = await cartService.updateItemQuantity(req.user._id, productId, req.body)

  res.json({
    success: true,
    message: "Carrito actualizado",
    data: cart,
  })
})

/**
 * DELETE /api/cart/items/:productId
 * @desc Eliminar item del carrito
 */
const removeFromCart = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const { productId } = req.params
  const { attributes = {} } = req.body
  const cart = await cartService.removeItem(req.user._id, productId, attributes)

  res.json({
    success: true,
    message: "Producto eliminado del carrito",
    data: cart,
  })
})

/**
 * DELETE /api/cart
 * @desc Vaciar carrito
 */
const clearCart = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const cart = await cartService.clearCart(req.user._id)

  res.json({
    success: true,
    message: "Carrito vaciado",
    data: cart,
  })
})

/**
 * POST /api/cart/coupon
 * @desc Aplicar cupón
 */
const applyCoupon = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const { code } = req.body
  const cart = await cartService.applyCoupon(req.user._id, code)

  res.json({
    success: true,
    message: "Cupón aplicado correctamente",
    data: cart,
  })
})

/**
 * PUT /api/cart/shipping-address
 * @desc Actualizar dirección de envío
 */
const updateShippingAddress = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const cart = await cartService.updateShippingAddress(req.user._id, req.body)

  res.json({
    success: true,
    message: "Dirección de envío actualizada",
    data: cart,
  })
})

/**
 * PUT /api/cart/shipping-method
 * @desc Actualizar método de envío
 */
const updateShippingMethod = catchAsync(async (req, res) => {
  if (!req.user) {
    throw ApiError.unauthorized("Usuario no autenticado")
  }

  const { method, cost } = req.body
  const cart = await cartService.updateShippingMethod(req.user._id, method, cost)

  res.json({
    success: true,
    message: "Método de envío actualizado",
    data: cart,
  })
})

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon,
  updateShippingAddress,
  updateShippingMethod,
}
