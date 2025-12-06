// src/modules/orders/order.controller.js

const orderService = require('./order.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class OrderController
 * @description Controlador ultra delgado para ORDERS
 * 
 * Responsabilidades:
 * - Recibir peticiones HTTP
 * - Delegar a orderService
 * - Formatear respuestas
 * 
 * Patrones aplicados:
 * - MVC Pattern (Controller)
 * - Thin Controller Pattern
 * - Delegation Pattern
 */

/** 
 * ==========================================
 * RUTAS DE USUARIO
 * ==========================================
 */

/**
 * @desc    Crear orden desde carrito
 * @route   POST /api/orders
 * @access  Private
 */
const createOrder = catchAsync(async (req, res) => {
  const order = await orderService.createOrder(req.user._id, req.body);
  
  res.status(201).json({
    success: true,
    message: 'Orden creada exitosamente',
    data: order
  });
});

/**
 * @desc    Obtener órdenes del usuario
 * @route   GET /api/orders
 * @access  Private
 */
const getUserOrders = catchAsync(async (req, res) => {
  const result = await orderService.getUserOrders(req.user._id, req.query);
  
  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
});

/**
 * @desc    Obtener orden por ID
 * @route   GET /api/orders/:id
 * @access  Private
 */
const getOrderById = catchAsync(async (req, res) => {
  const order = await orderService.getOrderById(req.params.id, req.user._id);
  
  res.json({
    success: true,
    data: order
  });
});

/**
 * @desc    Obtener tracking de orden
 * @route   GET /api/orders/:id/tracking
 * @access  Private
 */
const getOrderTracking = catchAsync(async (req, res) => {
  const tracking = await orderService.getOrderTracking(req.params.id, req.user._id);
  
  res.json({
    success: true,
    data: tracking
  });
});

/**
 * @desc    Cancelar orden
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = catchAsync(async (req, res) => {
  const order = await orderService.cancelOrder(req.params.id, req.user._id);
  
  res.json({
    success: true,
    message: 'Orden cancelada exitosamente',
    data: order
  });
});

/**
 * @desc    Solicitar devolución de orden
 * @route   POST /api/orders/:id/return
 * @access  Private
 */
const requestReturn = catchAsync(async (req, res) => {
  const order = await orderService.requestReturn(
    req.params.id, 
    req.user._id,
    req.body.reason
  );
  
  res.json({
    success: true,
    message: 'Solicitud de devolución enviada exitosamente',
    data: order
  });
});

/** 
 * ==========================================
 * RUTAS ADMINISTRATIVAS
 * ==========================================
 */

/**
 * @desc    Obtener todas las órdenes (Admin)
 * @route   GET /api/orders/admin/all
 * @access  Private/Admin
 */
const getAllOrders = catchAsync(async (req, res) => {
  const result = await orderService.getAllOrders(req.query);
  
  res.json({
    success: true,
    data: result.orders,
    pagination: result.pagination
  });
});

/**
 * @desc    Obtener detalles de orden (Admin)
 * @route   GET /api/orders/admin/:id
 * @access  Private/Admin
 */
const getOrderDetails = catchAsync(async (req, res) => {
  const order = await orderService.getOrderDetails(req.params.id);
  
  res.json({
    success: true,
    data: order
  });
});

/**
 * @desc    Actualizar estado de orden (Admin)
 * @route   PUT /api/orders/admin/:id
 * @access  Private/Admin
 */
const updateOrderStatus = catchAsync(async (req, res) => {
  const order = await orderService.updateOrderStatus(req.params.id, {
    ...req.body,
    updatedBy: req.user._id
  });
  
  res.json({
    success: true,
    message: 'Orden actualizada exitosamente',
    data: order
  });
});

/**
 * @desc    Procesar reembolso (Admin)
 * @route   POST /api/orders/admin/:id/refund
 * @access  Private/Admin
 */
const processRefund = catchAsync(async (req, res) => {
  const order = await orderService.processRefund(
    req.params.id,
    req.body.amount,
    req.body.reason
  );
  
  res.json({
    success: true,
    message: 'Reembolso procesado exitosamente',
    data: order
  });
});

module.exports = {
  // Usuario
  createOrder,
  getUserOrders,
  getOrderById,
  getOrderTracking,
  cancelOrder,
  requestReturn,
  
  // Admin
  getAllOrders,
  getOrderDetails,
  updateOrderStatus,
  processRefund
};