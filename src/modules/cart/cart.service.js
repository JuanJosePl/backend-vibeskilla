const Cart = require("./cart.model")
const Product = require("../products/product.model")
const ApiError = require("../../core/errors/ApiError")

/**
 * @class CartService
 * @description Servicio profesional de carrito con persistencia y análisis
 */
class CartService {
  /**
   * Obtener o crear carrito del usuario
   */
  async getOrCreateCart(userId) {
    let cart = await Cart.findOne({ user: userId }).populate("items.product", "name slug images stock price discount")

    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] })
    }

    return cart.toJSON()
  }

  /**
   * Agregar item al carrito
   */
  async addItem(userId, itemData) {
    const { productId, quantity = 1, attributes = {} } = itemData

    // Validar producto
    const product = await Product.findById(productId)
    if (!product) {
      throw ApiError.notFound("Producto no encontrado")
    }

    if (!product.isAvailable() && product.trackQuantity) {
      throw ApiError.badRequest("Producto no disponible")
    }

    // Validar stock
    if (product.trackQuantity && product.stock < quantity) {
      throw ApiError.badRequest(`Stock insuficiente. Disponible: ${product.stock}`)
    }

    let cart = await Cart.findOne({ user: userId })
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] })
    }

    await cart.addItem(productId, quantity, attributes)
    await cart.populate("items.product", "name slug images stock price")

    return cart.toJSON()
  }

  /**
   * Actualizar cantidad de item
   */
  async updateItemQuantity(userId, productId, updateData) {
    const { quantity, attributes = {} } = updateData

    if (quantity < 1) {
      throw ApiError.badRequest("La cantidad debe ser mayor a 0")
    }

    // Validar stock
    const product = await Product.findById(productId)
    if (product?.trackQuantity && product.stock < quantity) {
      throw ApiError.badRequest(`Stock insuficiente. Disponible: ${product.stock}`)
    }

    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    await cart.updateQuantity(productId, quantity, attributes)
    await cart.populate("items.product", "name slug images stock price")

    return cart.toJSON()
  }

  /**
   * Eliminar item del carrito
   */
  async removeItem(userId, productId, attributes = {}) {
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    await cart.removeItem(productId, attributes)
    await cart.populate("items.product", "name slug images price")

    return cart.toJSON()
  }

  /**
   * Vaciar carrito
   */
  async clearCart(userId) {
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    await cart.clear()
    return cart.toJSON()
  }

  /**
   * Aplicar cupón
   */
  async applyCoupon(userId, couponCode) {
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    // Validar cupón (integración con sistema de cupones)
    const coupon = await this._validateCoupon(couponCode)

    await cart.applyCoupon(coupon)
    await cart.populate("items.product", "name slug price")

    return cart.toJSON()
  }

  /**
   * Actualizar dirección de envío
   */
  async updateShippingAddress(userId, addressData) {
    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    cart.shippingAddress = addressData
    cart.lastActivityAt = new Date()
    await cart.save()

    return cart.toJSON()
  }

  /**
   * Actualizar método de envío
   */
  async updateShippingMethod(userId, method, cost) {
    const validMethods = ["standard", "express", "overnight", "pickup"]
    if (!validMethods.includes(method)) {
      throw ApiError.badRequest("Método de envío inválido")
    }

    const cart = await Cart.findOne({ user: userId })
    if (!cart) {
      throw ApiError.notFound("Carrito no encontrado")
    }

    cart.shippingMethod = method
    cart.shippingCost = cost || 0
    cart.lastActivityAt = new Date()
    await cart.save()

    return cart.toJSON()
  }

  /**
   * Obtener carrito abandonado
   */
  async getAbandonedCarts(hoursAgo = 24) {
    const timeThreshold = new Date(Date.now() - hoursAgo * 60 * 60 * 1000)

    return await Cart.find({
      lastActivityAt: { $lt: timeThreshold },
      status: "active",
      items: { $exists: true, $ne: [] },
    })
      .populate("user", "email name")
      .populate("items.product", "name price")
  }

  /**
   * Obtener métricas del carrito
   */
  async getCartMetrics() {
    const carts = await Cart.aggregate([
      {
        $group: {
          _id: null,
          totalCarts: { $sum: 1 },
          activeCarts: { $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] } },
          abandonedCarts: { $sum: { $cond: [{ $eq: ["$status", "abandoned"] }, 1, 0] } },
          avgCartValue: { $avg: "$total" },
          avgItemCount: { $avg: "$itemCount" },
        },
      },
    ])

    return carts[0] || {}
  }

  /**
   * Validar cupón (placeholder para integración)
   *
   * @private
   */
  async _validateCoupon(code) {
    const validCodes = {
      WELCOME10: { code: "WELCOME10", discount: 10, type: "percentage", minPurchase: 0 },
      SAVE20: { code: "SAVE20", discount: 20, type: "percentage", minPurchase: 50 },
      SHIP50: { code: "SHIP50", discount: 50, type: "shipping", minPurchase: 0 },
    }

    const coupon = validCodes[code.toUpperCase()]
    if (!coupon) {
      throw ApiError.badRequest("Cupón inválido o expirado")
    }

    return coupon
  }
}

module.exports = new CartService()
