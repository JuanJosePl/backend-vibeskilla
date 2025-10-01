const Order = require('../models/Order');
const Cart = require('../models/Cart');
const Product = require('../models/Product');

// @desc    Crear orden desde carrito
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, billingAddress, paymentMethod, customerNotes } = req.body;

    // Obtener carrito
    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product', 'name images sku price stock trackQuantity allowBackorder');
    
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'El carrito está vacío'
      });
    }

    // Preparar items de la orden (snapshots)
    const orderItems = cart.items.map(item => ({
      product: item.product._id,
      productName: item.product.name,
      productImage: item.product.images[0]?.url || '',
      sku: item.product.sku,
      quantity: item.quantity,
      unitPrice: item.price,
      attributes: item.attributes,
      variant: item.variant
    }));

    // Crear orden
    const order = new Order({
      user: req.user._id,
      customerInfo: {
        email: req.user.email,
        firstName: req.user.profile.firstName,
        lastName: req.user.profile.lastName,
        phone: req.user.profile.phone
      },
      items: orderItems,
      subtotal: cart.subtotal,
      shippingCost: cart.shippingCost,
      taxAmount: cart.taxAmount,
      discountAmount: cart.discountAmount,
      totalAmount: cart.total,
      shippingAddress: shippingAddress || cart.shippingAddress,
      billingAddress: billingAddress || shippingAddress || cart.shippingAddress,
      shippingMethod: cart.shippingMethod,
      paymentMethod,
      customerNotes,
      coupon: cart.coupon
    });

    await order.save();

    // Limpiar carrito
    await cart.clear();

    res.status(201).json({
      success: true,
      message: 'Orden creada exitosamente',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al crear orden',
      error: error.message
    });
  }
};

// @desc    Obtener órdenes del usuario
// @route   GET /api/orders
// @access  Private
const getUserOrders = async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;
    
    let query = { user: req.user._id };
    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('items.product', 'name images slug');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes',
      error: error.message
    });
  }
};

// @desc    Obtener orden por ID
// @route   GET /api/orders/:id
// @access  Private
const getOrderById = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    }).populate('items.product', 'name images slug');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    res.json({
      success: true,
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener orden',
      error: error.message
    });
  }
};

// @desc    Cancelar orden
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (!['pending', 'confirmed'].includes(order.status)) {
      return res.status(400).json({
        success: false,
        message: 'No se puede cancelar la orden en su estado actual'
      });
    }

    await order.cancelOrder();

    res.json({
      success: true,
      message: 'Orden cancelada exitosamente',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al cancelar orden',
      error: error.message
    });
  }
};

// @desc    Obtener todas las órdenes (Admin)
// @route   GET /api/orders/admin/all
// @access  Private/Admin
const getAllOrders = async (req, res) => {
  try {
    const { page = 1, limit = 20, status, paymentStatus } = req.query;
    
    let query = {};
    if (status) query.status = status;
    if (paymentStatus) query.paymentStatus = paymentStatus;

    const orders = await Order.find(query)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .populate('user', 'profile.firstName profile.lastName email')
      .populate('items.product', 'name images');

    const total = await Order.countDocuments(query);

    res.json({
      success: true,
      data: orders,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener órdenes',
      error: error.message
    });
  }
};

// @desc    Actualizar estado de orden (Admin)
// @route   PUT /api/orders/admin/:id
// @access  Private/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber, adminNotes } = req.body;

    const order = await Order.findById(req.params.id);
    
    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Orden no encontrada'
      });
    }

    if (status) order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    if (adminNotes) order.adminNotes = adminNotes;

    await order.save();

    res.json({
      success: true,
      message: 'Orden actualizada exitosamente',
      data: order
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar orden',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus
};