const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Obtener carrito del usuario
// @route   GET /api/cart
// @access  Private
const getCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name images slug stock trackQuantity allowBackorder');

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    res.json({
      success: true,
      data: {
        ...cart.toObject(),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        total: cart.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener carrito',
      error: error.message
    });
  }
};

// @desc    Agregar item al carrito
// @route   POST /api/cart/items
// @access  Private
const addToCart = async (req, res) => {
  try {
    const { productId, quantity = 1, attributes = {} } = req.body;

    // Verificar producto
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    if (!product.isAvailable() && product.trackQuantity) {
      return res.status(400).json({
        success: false,
        message: 'Producto no disponible'
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    await cart.addItem(productId, quantity, attributes);
    await cart.populate('items.product', 'name images slug stock');

    res.json({
      success: true,
      message: 'Producto agregado al carrito',
      data: {
        ...cart.toObject(),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        total: cart.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al agregar al carrito',
      error: error.message
    });
  }
};

// @desc    Actualizar cantidad en carrito
// @route   PUT /api/cart/items/:productId
// @access  Private
const updateCartItem = async (req, res) => {
  try {
    const { productId } = req.params;
    const { quantity, attributes = {} } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    await cart.updateQuantity(productId, quantity, attributes);
    await cart.populate('items.product', 'name images slug stock');

    res.json({
      success: true,
      message: 'Carrito actualizado',
      data: {
        ...cart.toObject(),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        total: cart.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar carrito',
      error: error.message
    });
  }
};

// @desc    Eliminar item del carrito
// @route   DELETE /api/cart/items/:productId
// @access  Private
const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const { attributes = {} } = req.body;

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    await cart.updateQuantity(productId, 0, attributes);
    await cart.populate('items.product', 'name images slug stock');

    res.json({
      success: true,
      message: 'Producto eliminado del carrito',
      data: {
        ...cart.toObject(),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        total: cart.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar del carrito',
      error: error.message
    });
  }
};

// @desc    Limpiar carrito
// @route   DELETE /api/cart
// @access  Private
const clearCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    await cart.clear();

    res.json({
      success: true,
      message: 'Carrito limpiado',
      data: {
        ...cart.toObject(),
        subtotal: 0,
        discountAmount: 0,
        taxAmount: 0,
        total: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al limpiar carrito',
      error: error.message
    });
  }
};

// @desc    Aplicar cupón
// @route   POST /api/cart/coupon
// @access  Private
const applyCoupon = async (req, res) => {
  try {
    const { code } = req.body;

    // Aquí integrarías con tu sistema de cupones
    // Por ahora es un ejemplo simple
    const coupon = {
      code: code.toUpperCase(),
      discount: 10,
      type: 'percentage'
    };

    const cart = await Cart.findOne({ user: req.user._id });
    
    if (!cart) {
      return res.status(404).json({
        success: false,
        message: 'Carrito no encontrado'
      });
    }

    cart.coupon = coupon;
    await cart.save();
    await cart.populate('items.product', 'name images slug stock');

    res.json({
      success: true,
      message: 'Cupón aplicado correctamente',
      data: {
        ...cart.toObject(),
        subtotal: cart.subtotal,
        discountAmount: cart.discountAmount,
        taxAmount: cart.taxAmount,
        total: cart.total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al aplicar cupón',
      error: error.message
    });
  }
};

module.exports = {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  applyCoupon
};