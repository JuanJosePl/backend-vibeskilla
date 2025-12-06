const Joi = require('joi');

/**
 * @description Validaciones para el módulo SEARCH
 * 
 * Responsabilidades:
 * - Validar query params de búsqueda
 * - Validar paginación
 * - Validar filtros de admin
 */

/**
 * Validación para sugerencias de búsqueda
 */
const getSearchSuggestions = {
  query: Joi.object({
    q: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'La búsqueda debe tener al menos 2 caracteres',
        'string.max': 'La búsqueda no puede exceder 100 caracteres',
        'any.required': 'El parámetro de búsqueda (q) es requerido'
      }),
    limit: Joi.number().integer().min(1).max(20).default(5)
  })
};

/**
 * Validación para búsquedas populares
 */
const getPopularSearches = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10),
    days: Joi.number().integer().min(1).max(365).default(30)
  })
};

/**
 * Validación para búsquedas en tendencia
 */
const getTrendingSearches = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(50).default(10)
  })
};

/**
 * Validación para historial de búsqueda
 */
const getUserSearchHistory = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20)
  })
};

/**
 * Validación para búsquedas fallidas (Admin)
 */
const getFailedSearches = {
  query: Joi.object({
    limit: Joi.number().integer().min(1).max(100).default(20),
    days: Joi.number().integer().min(1).max(365).default(30)
  })
};

/**
 * Validación para estadísticas de búsqueda (Admin)
 */
const getSearchStats = {
  query: Joi.object({
    days: Joi.number().integer().min(1).max(365).default(30)
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
  searchValidation: {
    getSearchSuggestions,
    getPopularSearches,
    getTrendingSearches,
    getUserSearchHistory,
    getFailedSearches,
    getSearchStats
  }
};