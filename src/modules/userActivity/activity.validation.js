const Joi = require('joi');

/**
 * @description Validaciones para el módulo USER ACTIVITY
 */

/**
 * Validación para registrar actividad
 */
const logActivityValidation = {
  body: Joi.object({
    activityType: Joi.string()
      .valid(
        'page_view', 'product_view', 'category_view', 'search',
        'add_to_cart', 'remove_from_cart', 'add_to_wishlist', 'remove_from_wishlist',
        'checkout_started', 'order_completed', 'review_created',
        'login', 'logout', 'register'
      )
      .required(),
    
    resource: Joi.object({
      resourceType: Joi.string().valid('product', 'category', 'order', 'page', 'search'),
      resourceId: Joi.string(),
      resourceName: Joi.string(),
      resourceSlug: Joi.string()
    }).optional(),
    
    metadata: Joi.object().optional(),
    sessionId: Joi.string().optional(),
    duration: Joi.number().min(0).optional()
  })
};

/**
 * Validación para query params
 */
const getActivityValidation = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(1000).default(50),
    days: Joi.number().integer().min(1).max(365).default(30),
    type: Joi.string().valid(
      'page_view', 'product_view', 'category_view', 'search',
      'add_to_cart', 'add_to_wishlist', 'checkout_started', 'order_completed'
    ).optional()
  })
};

/**
 * Middleware para validar requests
 */
const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    stripUnknown: true
  };

  // Validar query
  if (schema.query) {
    const { error, value } = schema.query.validate(req.query, validationOptions);
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en query',
        errors
      });
    }
    req.query = value;
  }

  // Validar body
  if (schema.body) {
    const { error, value } = schema.body.validate(req.body, validationOptions);
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación',
        errors
      });
    }
    req.body = value;
  }

  next();
};

module.exports = {
  logActivityValidation,
  getActivityValidation,
  validate
};