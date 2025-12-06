// src/modules/orders/order.service.js

const Order = require("./order.model");
const Cart = require("../cart/cart.model");
const Product = require("../products/product.model");
const User = require("../auth/auth.model");
const ApiError = require("../../core/errors/ApiError");
const emailService = require("../../services/email.service");

/**
 * @class OrderService
 * @description Lógica de negocio para órdenes de compra
 * 
 * Responsabilidades:
 * - Crear órdenes desde carrito
 * - Validar disponibilidad de stock
 * - Gestionar estados (state machine)
 * - Procesar reembolsos
 * - Enviar notificaciones
 * - Gestionar fulfillment (tracking, delivery)
 * 
 * Patrones aplicados:
 * - Service Layer Pattern
 * - State Machine Pattern (estados de orden)
 * - Transaction Script Pattern
 * - Domain-Driven Design (reglas de negocio)
 */
class OrderService {
  
  // ==========================================
  // OPERACIONES DE USUARIO
  // ==========================================
  
  /**
   * Crear orden desde el carrito del usuario
   * 
   * Flujo:
   * 1. Validar carrito no vacío
   * 2. Validar stock disponible
   * 3. Crear snapshot de productos
   * 4. Crear orden
   * 5. Reducir stock
   * 6. Limpiar carrito
   * 7. Enviar confirmación por email
   * 
   * @param {string} userId - ID del usuario
   * @param {Object} orderData - Datos de la orden
   * @returns {Promise<Object>} Orden creada
   */
  async createOrder(userId, orderData) {
    try {
      const { shippingAddress, billingAddress, paymentMethod, customerNotes } = orderData;

      // 1. Obtener carrito con productos populados
      const cart = await Cart.findOne({ user: userId }).populate(
        "items.product",
        "name images sku price stock trackQuantity allowBackorder"
      );

      if (!cart || cart.items.length === 0) {
        throw ApiError.badRequest("El carrito está vacío");
      }

      // 2. Verificar disponibilidad de stock para cada item
      const stockValidationErrors = [];
      
      for (const item of cart.items) {
        if (!item.product) {
          throw ApiError.badRequest(
            "Uno de los productos en el carrito ya no existe"
          );
        }

        // Verificar si el producto está activo
        if (item.product.status !== 'active') {
          stockValidationErrors.push(`${item.product.name} ya no está disponible`);
          continue;
        }

        // Verificar stock
        if (item.product.trackQuantity) {
          const hasStock = item.product.stock >= item.quantity;
          if (!hasStock && !item.product.allowBackorder) {
            stockValidationErrors.push(
              `Stock insuficiente para ${item.product.name}. Disponible: ${item.product.stock}`
            );
          }
        }
      }

      if (stockValidationErrors.length > 0) {
        throw ApiError.badRequest(
          `Problemas de stock: ${stockValidationErrors.join(', ')}`
        );
      }

      // 3. Obtener info del usuario
      const user = await User.findById(userId);
      if (!user) {
        throw ApiError.notFound('Usuario no encontrado');
      }

      // 4. Preparar items de la orden (snapshots inmutables)
      const orderItems = cart.items.map((item) => ({
        product: item.product._id,
        productName: item.product.name,
        productImage: item.product.images[0]?.url || "",
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.price,
        attributes: item.attributes,
        variant: item.variant,
      }));

      // 5. Crear orden
      const order = await Order.create({
        user: userId,
        customerInfo: {
          email: user.email,
          firstName: user.profile.firstName,
          lastName: user.profile.lastName,
          phone: user.profile.phone || shippingAddress.phone,
        },
        items: orderItems,
        subtotal: cart.subtotal,
        shippingCost: cart.shippingCost || 0,
        taxAmount: cart.taxAmount || 0,
        discountAmount: cart.discountAmount || 0,
        totalAmount: cart.total,
        shippingAddress,
        billingAddress: billingAddress || shippingAddress,
        shippingMethod: cart.shippingMethod || 'standard',
        paymentMethod,
        customerNotes,
        coupon: cart.coupon,
      });

      // 6. Reducir stock de productos
      await this._reduceProductStock(cart.items);

      // 7. Limpiar carrito
      await cart.clear();

      // 8. Enviar email de confirmación (async, no bloqueante)
      this._sendOrderConfirmationEmail(order, user).catch(err => {
        console.error('Error enviando email de confirmación:', err);
      });

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en createOrder:', error);
      throw ApiError.internal('Error al crear la orden');
    }
  }

  /**
   * Obtener órdenes del usuario con filtros y paginación
   * 
   * @param {string} userId - ID del usuario
   * @param {Object} options - Opciones de filtrado y paginación
   * @returns {Promise<Object>} Órdenes y paginación
   */
  async getUserOrders(userId, options = {}) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        status,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = { user: userId };
      
      if (status) {
        query.status = status;
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort(sort)
          .limit(parseInt(limit))
          .skip(skip)
          .populate("items.product", "name images slug")
          .lean(),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
      };
      
    } catch (error) {
      console.error('Error en getUserOrders:', error);
      throw ApiError.internal('Error al obtener órdenes');
    }
  }

  /**
   * Obtener orden por ID (validando que pertenezca al usuario)
   * 
   * @param {string} orderId - ID de la orden
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Orden
   */
  async getOrderById(orderId, userId) {
    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId 
      }).populate("items.product", "name images slug");

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en getOrderById:', error);
      throw ApiError.internal('Error al obtener orden');
    }
  }

  /**
   * Obtener tracking de orden
   * 
   * @param {string} orderId - ID de la orden
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Información de tracking
   */
  async getOrderTracking(orderId, userId) {
    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId 
      }).select('orderNumber status trackingNumber shippedAt deliveredAt createdAt');

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      // Construir timeline de eventos
      const timeline = [
        {
          status: 'pending',
          label: 'Orden creada',
          date: order.createdAt,
          completed: true
        },
        {
          status: 'confirmed',
          label: 'Orden confirmada',
          date: order.confirmedAt,
          completed: ['confirmed', 'processing', 'shipped', 'delivered'].includes(order.status)
        },
        {
          status: 'processing',
          label: 'Procesando',
          completed: ['processing', 'shipped', 'delivered'].includes(order.status)
        },
        {
          status: 'shipped',
          label: 'Enviado',
          date: order.shippedAt,
          completed: ['shipped', 'delivered'].includes(order.status)
        },
        {
          status: 'delivered',
          label: 'Entregado',
          date: order.deliveredAt,
          completed: order.status === 'delivered'
        }
      ];

      return {
        orderNumber: order.orderNumber,
        currentStatus: order.status,
        trackingNumber: order.trackingNumber,
        timeline
      };
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en getOrderTracking:', error);
      throw ApiError.internal('Error al obtener tracking');
    }
  }

  /**
   * Cancelar orden (solo si está en pending/confirmed)
   * 
   * @param {string} orderId - ID de la orden
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Orden cancelada
   */
  async cancelOrder(orderId, userId) {
    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId 
      });

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      // Usar método del modelo (contiene validaciones de dominio)
      await order.cancelOrder();

      // Restaurar stock
      await this._restoreProductStock(order.items);

      // Enviar email de cancelación
      this._sendOrderCancellationEmail(order).catch(err => {
        console.error('Error enviando email de cancelación:', err);
      });

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.message) throw ApiError.badRequest(error.message);
      console.error('Error en cancelOrder:', error);
      throw ApiError.internal('Error al cancelar orden');
    }
  }

  /**
   * Solicitar devolución de orden
   * 
   * @param {string} orderId - ID de la orden
   * @param {string} userId - ID del usuario
   * @param {string} reason - Razón de la devolución
   * @returns {Promise<Object>} Orden actualizada
   */
  async requestReturn(orderId, userId, reason) {
    try {
      const order = await Order.findOne({ 
        _id: orderId, 
        user: userId 
      });

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      // Validar que la orden esté entregada
      if (order.status !== 'delivered') {
        throw ApiError.badRequest('Solo se pueden devolver órdenes entregadas');
      }

      // Validar que no hayan pasado más de 30 días
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      if (order.deliveredAt < thirtyDaysAgo) {
        throw ApiError.badRequest('El período de devolución ha expirado (30 días)');
      }

      // Actualizar estado
      order.status = 'returned';
      order.customerNotes = reason;
      await order.save();

      // Notificar a administradores
      this._sendReturnRequestEmail(order, reason).catch(err => {
        console.error('Error enviando email de devolución:', err);
      });

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en requestReturn:', error);
      throw ApiError.internal('Error al solicitar devolución');
    }
  }

  // ==========================================
  // OPERACIONES ADMINISTRATIVAS
  // ==========================================

  /**
   * Obtener todas las órdenes con filtros (Admin)
   * 
   * @param {Object} options - Opciones de filtrado y paginación
   * @returns {Promise<Object>} Órdenes y paginación
   */
  async getAllOrders(options = {}) {
    try {
      const { 
        page = 1, 
        limit = 20, 
        status, 
        paymentStatus,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = {};
      
      if (status) query.status = status;
      if (paymentStatus) query.paymentStatus = paymentStatus;
      
      if (search) {
        query.$or = [
          { orderNumber: { $regex: search, $options: 'i' } },
          { 'customerInfo.email': { $regex: search, $options: 'i' } },
          { 'customerInfo.firstName': { $regex: search, $options: 'i' } },
          { 'customerInfo.lastName': { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [orders, total] = await Promise.all([
        Order.find(query)
          .sort(sort)
          .limit(parseInt(limit))
          .skip(skip)
          .populate("user", "profile.firstName profile.lastName email")
          .populate("items.product", "name images")
          .lean(),
        Order.countDocuments(query),
      ]);

      return {
        orders,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        },
      };
      
    } catch (error) {
      console.error('Error en getAllOrders:', error);
      throw ApiError.internal('Error al obtener órdenes');
    }
  }

  /**
   * Obtener detalles completos de orden (Admin)
   * 
   * @param {string} orderId - ID de la orden
   * @returns {Promise<Object>} Orden con todos los datos
   */
  async getOrderDetails(orderId) {
    try {
      const order = await Order.findById(orderId)
        .populate("user", "profile.firstName profile.lastName email phone isActive")
        .populate("items.product", "name images slug stock status");

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      console.error('Error en getOrderDetails:', error);
      throw ApiError.internal('Error al obtener detalles de orden');
    }
  }

  /**
   * Actualizar estado de orden (Admin)
   * 
   * @param {string} orderId - ID de la orden
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} Orden actualizada
   */
  async updateOrderStatus(orderId, updateData) {
    try {
      const { status, paymentStatus, trackingNumber, adminNotes, updatedBy } = updateData;

      const order = await Order.findById(orderId);

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      // Actualizar estado usando métodos del modelo (validaciones incluidas)
      if (status) {
        if (status === 'shipped' && trackingNumber) {
          await order.markAsShipped(trackingNumber);
        } else if (status === 'delivered') {
          await order.markAsDelivered();
        } else {
          order.status = status;
        }
      }

      if (paymentStatus === 'paid') {
        await order.markAsPaid();
      } else if (paymentStatus) {
        order.paymentStatus = paymentStatus;
      }

      if (trackingNumber !== undefined) order.trackingNumber = trackingNumber;
      if (adminNotes !== undefined) order.adminNotes = adminNotes;

      await order.save();

      // Enviar notificación al cliente si cambió a shipped o delivered
      if (status === 'shipped' || status === 'delivered') {
        this._sendOrderStatusUpdateEmail(order).catch(err => {
          console.error('Error enviando email de actualización:', err);
        });
      }

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.message) throw ApiError.badRequest(error.message);
      console.error('Error en updateOrderStatus:', error);
      throw ApiError.internal('Error al actualizar orden');
    }
  }

  /**
   * Procesar reembolso (Admin)
   * 
   * @param {string} orderId - ID de la orden
   * @param {number} amount - Monto a reembolsar
   * @param {string} reason - Razón del reembolso
   * @returns {Promise<Object>} Orden actualizada
   */
  async processRefund(orderId, amount, reason) {
    try {
      const order = await Order.findById(orderId);

      if (!order) {
        throw ApiError.notFound("Orden no encontrada");
      }

      // Usar método del modelo (validaciones incluidas)
      await order.processRefund(amount);

      // Actualizar notas del admin
      order.adminNotes = `${order.adminNotes || ''}\nReembolso: $${amount} - ${reason}`.trim();
      await order.save();

      // Restaurar stock si es reembolso total
      if (order.paymentStatus === 'refunded') {
        await this._restoreProductStock(order.items);
      }

      // Enviar email de confirmación de reembolso
      this._sendRefundConfirmationEmail(order, amount).catch(err => {
        console.error('Error enviando email de reembolso:', err);
      });

      return order;
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      if (error.message) throw ApiError.badRequest(error.message);
      console.error('Error en processRefund:', error);
      throw ApiError.internal('Error al procesar reembolso');
    }
  }

  // ==========================================
  // MÉTODOS PRIVADOS
  // ==========================================

  /**
   * Reducir stock de productos al crear orden
   * @private
   * @param {Array} items - Items del carrito
   */
  async _reduceProductStock(items) {
    const updates = items
      .map((item) => {
        if (item.product.trackQuantity) {
          return Product.findByIdAndUpdate(item.product._id, {
            $inc: {
              stock: -item.quantity,
              salesCount: item.quantity,
            },
          });
        }
        return null;
      })
      .filter(Boolean);

    await Promise.all(updates);
  }

  /**
   * Restaurar stock de productos al cancelar orden
   * @private
   * @param {Array} items - Items de la orden
   */
  async _restoreProductStock(items) {
    const updates = items.map((item) =>
      Product.findByIdAndUpdate(item.product, {
        $inc: {
          stock: item.quantity,
          salesCount: -item.quantity,
        },
      })
    );

    await Promise.all(updates);
  }

  /**
   * Enviar email de confirmación de orden
   * @private
   */
  async _sendOrderConfirmationEmail(order, user) {
    await emailService.sendOrderConfirmation({
      to: user.email,
      name: user.profile.firstName,
      orderNumber: order.orderNumber,
      totalAmount: order.totalAmount,
      items: order.items
    });
  }

  /**
   * Enviar email de cancelación de orden
   * @private
   */
  async _sendOrderCancellationEmail(order) {
    await emailService.sendOrderCancellation({
      to: order.customerInfo.email,
      name: order.customerInfo.firstName,
      orderNumber: order.orderNumber
    });
  }

  /**
   * Enviar email de actualización de estado
   * @private
   */
  async _sendOrderStatusUpdateEmail(order) {
    await emailService.sendOrderStatusUpdate({
      to: order.customerInfo.email,
      name: order.customerInfo.firstName,
      orderNumber: order.orderNumber,
      status: order.status,
      trackingNumber: order.trackingNumber
    });
  }

  /**
   * Enviar email de solicitud de devolución
   * @private
   */
  async _sendReturnRequestEmail(order, reason) {
    await emailService.sendReturnRequest({
      orderNumber: order.orderNumber,
      customerEmail: order.customerInfo.email,
      reason
    });
  }

  /**
   * Enviar email de confirmación de reembolso
   * @private
   */
  async _sendRefundConfirmationEmail(order, amount) {
    await emailService.sendRefundConfirmation({
      to: order.customerInfo.email,
      name: order.customerInfo.firstName,
      orderNumber: order.orderNumber,
      refundAmount: amount
    });
  }
}

module.exports = new OrderService();