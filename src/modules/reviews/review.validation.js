// src/modules/reviews/review.validation.js

const Joi = require('joi');

/**
 * @description Validaciones para el módulo REVIEWS
 * 
 * Responsabilidades:
 * - Validar datos de reviews
 * - Validar filtros y paginación
 * - Validar operaciones de moderación
 * - Prevenir inyecciones y spam
 * 
 * Patrones aplicados:
 * - Input Validation Pattern
 * - Schema Validation
 */

/**
 * Validación para crear review
 */
const createReview = {
  params: Joi.object({
    productId: Joi.string().required()
  }),
  body: Joi.object({
    rating: Joi.number()
      .integer()
      .min(1)
      .max(5)
      .required()
      .messages({
        'number.min': 'La calificación mínima es 1',
        'number.max': 'La calificación máxima es 5',
        'any.required': 'La calificación es requerida'
      }),
    
    title: Joi.string()
      .trim()
      .max(100)
      .optional()
      .allow('')
      .messages({
        'string.max': 'El título no puede tener más de 100 caracteres'
      }),
    
    comment: Joi.string()
      .trim()
      .min(10)
      .max(1000)
      .required()
      .messages({
        'string.min': 'El comentario debe tener al menos 10 caracteres',
        'string.max': 'El comentario no puede tener más de 1000 caracteres',
        'any.required': 'El comentario es requerido'
      }),
    
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          alt: Joi.string().max(200).optional()
        })
      )
      .max(5)
      .optional()
      .messages({
        'array.max': 'Máximo 5 imágenes por review'
      })
  })
};

/**
 * Validación para actualizar review
 */
const updateReview = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    rating: Joi.number().integer().min(1).max(5).optional(),
    title: Joi.string().trim().max(100).optional().allow(''),
    comment: Joi.string().trim().min(10).max(1000).optional(),
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          alt: Joi.string().max(200).optional()
        })
      )
      .max(5)
      .optional()
  }).min(1) // Al menos un campo
};

/**
 * Validación para obtener reviews de producto
 */
const getProductReviews = {
  params: Joi.object({
    productId: Joi.string().required()
  }),
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(50).default(10),
    rating: Joi.number().integer().min(1).max(5).optional(),
    verified: Joi.string().valid('true', 'false').optional(),
    sortBy: Joi.string().valid('createdAt', 'rating', 'helpfulCount').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validación para reportar review
 */
const reportReview = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    reason: Joi.string()
      .trim()
      .min(10)
      .max(500)
      .required()
      .messages({
        'string.min': 'La razón debe tener al menos 10 caracteres',
        'any.required': 'La razón del reporte es requerida'
      })
  })
};

/**
 * Validación para reviews pendientes (Admin)
 */
const getPending = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

/**
 * Validación para ID de review
 */
const reviewId = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

/**
 * Validación para ID de producto
 */
const productId = {
  params: Joi.object({
    productId: Joi.string().required()
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
  reviewValidation: {
    createReview,
    updateReview,
    getProductReviews,
    reportReview,
    getPending,
    reviewId,
    productId
  }
};