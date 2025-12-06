// src/modules/orders/order.validation.js

const Joi = require('joi');

/**
 * @description Validaciones para el módulo ORDERS
 * 
 * Responsabilidades:
 * - Validar datos de creación de órdenes
 * - Validar filtros y paginación
 * - Validar operaciones administrativas
 * - Prevenir inyecciones y datos inválidos
 * 
 * Patrones aplicados:
 * - Input Validation Pattern
 * - Schema Validation
 */

/**
 * Schema para dirección (reutilizable)
 */
const addressSchema = Joi.object({
  firstName: Joi.string().trim().min(2).max(50).required(),
  lastName: Joi.string().trim().min(2).max(50).required(),
  street: Joi.string().trim().min(5).max(200).required(),
  city: Joi.string().trim().min(2).max(100).required(),
  state: Joi.string().trim().min(2).max(100).required(),
  zipCode: Joi.string().trim().min(3).max(20).required(),
  country: Joi.string().trim().default('Colombia'),
  phone: Joi.string().trim().pattern(/^[0-9\s\-\+$$$$]+$/).required()
});

/**
 * Validación para crear orden
 */
const createOrder = {
  body: Joi.object({
    shippingAddress: addressSchema.required(),
    billingAddress: addressSchema.optional(),
    paymentMethod: Joi.string()
      .valid('credit_card', 'debit_card', 'paypal', 'bank_transfer', 'cash_on_delivery')
      .required()
      .messages({
        'any.only': 'Método de pago inválido',
        'any.required': 'El método de pago es requerido'
      }),
    customerNotes: Joi.string().max(500).optional().allow('')
  })
};

/**
 * Validación para obtener órdenes del usuario
 */
const getUserOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(10),
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    ).optional(),
    sortBy: Joi.string().valid('createdAt', 'totalAmount', 'status').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validación para obtener todas las órdenes (Admin)
 */
const getAllOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    ).optional(),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded').optional(),
    search: Joi.string().trim().min(2).max(100).optional(),
    sortBy: Joi.string().valid('createdAt', 'totalAmount').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validación para actualizar estado de orden (Admin)
 */
const updateOrderStatus = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    status: Joi.string()
      .valid('pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned')
      .optional(),
    paymentStatus: Joi.string()
      .valid('pending', 'paid', 'failed', 'refunded')
      .optional(),
    trackingNumber: Joi.string().trim().max(100).optional().allow(''),
    adminNotes: Joi.string().max(1000).optional().allow('')
  }).min(1)
};

/**
 * Validación para procesar reembolso
 */
const processRefund = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    amount: Joi.number().min(0).required().messages({
      'number.min': 'El monto del reembolso debe ser mayor a 0',
      'any.required': 'El monto es requerido'
    }),
    reason: Joi.string().trim().min(10).max(500).required().messages({
      'string.min': 'La razón debe tener al menos 10 caracteres',
      'any.required': 'La razón del reembolso es requerida'
    })
  })
};

/**
 * Validación para solicitar devolución
 */
const requestReturn = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    reason: Joi.string().trim().min(10).max(500).required().messages({
      'string.min': 'La razón debe tener al menos 10 caracteres',
      'any.required': 'La razón de la devolución es requerida'
    })
  })
};

/**
 * Validación para ID de orden
 */
const orderId = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

/**
 * Middleware para validar requests
 * @param {Object} schema - Schema Joi con params/query/body
 * @returns {Function} Middleware Express
 */
const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    stripUnknown: true,
    convert: true
  };

  const errors = [];

  // Validar params
  if (schema.params) {
    const { error } = schema.params.validate(req.params, validationOptions);
    if (error) {
      errors.push(...error.details.map(detail => detail.message));
    }
  }

  // Validar query
  if (schema.query) {
    const { error, value } = schema.query.validate(req.query, validationOptions);
    if (error) {
      errors.push(...error.details.map(detail => detail.message));
    } else {
      req.query = value;
    }
  }

  // Validar body
  if (schema.body) {
    const { error, value } = schema.body.validate(req.body, validationOptions);
    if (error) {
      errors.push(...error.details.map(detail => detail.message));
    } else {
      req.body = value;
    }
  }

  if (errors.length > 0) {
    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  next();
};

module.exports = {
  validate,
  orderValidation: {
    createOrder,
    getUserOrders,
    getAllOrders,
    updateOrderStatus,
    processRefund,
    requestReturn,
    orderId
  }
};