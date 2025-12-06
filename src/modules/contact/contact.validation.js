// src/modules/contact/contact.validation.js

const Joi = require('joi');

/**
 * @description Validaciones para el módulo CONTACT
 * 
 * Responsabilidades:
 * - Validar datos del formulario de contacto
 * - Validar operaciones administrativas
 * - Prevenir inyecciones y spam
 * 
 * Patrones aplicados:
 * - Input Validation Pattern
 * - Schema Validation
 */

/**
 * Validación para enviar mensaje de contacto
 */
const sendMessage = {
  body: Joi.object({
    name: Joi.string()
      .trim()
      .min(2)
      .max(100)
      .required()
      .messages({
        'string.min': 'El nombre debe tener al menos 2 caracteres',
        'string.max': 'El nombre no puede tener más de 100 caracteres',
        'any.required': 'El nombre es requerido'
      }),
    
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'El email es requerido'
      }),
    
    phone: Joi.string()
      .trim()
      .pattern(/^[0-9\s\-\+$$$$]*$/)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Teléfono inválido'
      }),
    
    subject: Joi.string()
      .trim()
      .min(5)
      .max(200)
      .required()
      .messages({
        'string.min': 'El asunto debe tener al menos 5 caracteres',
        'string.max': 'El asunto no puede tener más de 200 caracteres',
        'any.required': 'El asunto es requerido'
      }),
    
    message: Joi.string()
      .trim()
      .min(10)
      .max(2000)
      .required()
      .messages({
        'string.min': 'El mensaje debe tener al menos 10 caracteres',
        'string.max': 'El mensaje no puede tener más de 2000 caracteres',
        'any.required': 'El mensaje es requerido'
      })
  })
};

/**
 * Validación para obtener mensajes (Admin)
 */
const getMessages = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('new', 'read', 'replied', 'archived'),
    search: Joi.string().trim().min(2).max(100),
    sortBy: Joi.string().valid('createdAt', 'name', 'email').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

/**
 * Validación para ID de mensaje
 */
const messageId = {
  params: Joi.object({
    id: Joi.string().required().messages({
      'any.required': 'ID del mensaje es requerido'
    })
  })
};

/**
 * Validación para responder mensaje
 */
const replyMessage = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    reply: Joi.string()
      .trim()
      .min(10)
      .max(2000)
      .required()
      .messages({
        'string.min': 'La respuesta debe tener al menos 10 caracteres',
        'string.max': 'La respuesta no puede tener más de 2000 caracteres',
        'any.required': 'La respuesta es requerida'
      })
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
  contactValidation: {
    sendMessage,
    getMessages,
    messageId,
    replyMessage
  }
};