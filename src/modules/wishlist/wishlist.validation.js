const Joi = require('joi');

/**
 * @description Validaciones para el módulo WISHLIST
 * 100% consistente con wishlist.model.js
 */

/**
 * Validación para agregar item
 */
const addItemValidation = {
  body: Joi.object({
    productId: Joi.string()
      .required()
      .messages({
        'any.required': 'El ID del producto es requerido'
      }),
    notifyPriceChange: Joi.boolean()
      .default(false),
    notifyAvailability: Joi.boolean()
      .default(false)
  })
};

/**
 * Validación para remover item
 */
const removeItemValidation = {
  params: Joi.object({
    productId: Joi.string().required()
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

  // Validar params
  if (schema.params) {
    const { error } = schema.params.validate(req.params, validationOptions);
    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        success: false,
        message: 'Errores de validación en parámetros',
        errors
      });
    }
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
  addItemValidation,
  removeItemValidation,
  validate
};