const Joi = require("joi");

/**
 * Validaciones para el módulo CART
 */

const addItemValidation = {
  body: Joi.object({
    productId: Joi.string().required().messages({
      "any.required": "El ID del producto es requerido",
    }),

    quantity: Joi.number().integer().min(1).max(9999).default(1).messages({
      "number.min": "La cantidad mínima es 1",
      "number.max": "La cantidad máxima es 9999",
    }),

    attributes: Joi.object({
      size: Joi.string().optional().allow("", null),
      color: Joi.string().optional().allow("", null),
      material: Joi.string().optional().allow("", null),
      custom: Joi.any().optional(),
    }).default({}),
  }),
};

const updateQuantityValidation = {
  params: Joi.object({
    productId: Joi.string().required(),
  }),
  body: Joi.object({
    quantity: Joi.number().integer().min(1).max(9999).required().messages({
      "number.min": "La cantidad mínima es 1",
      "any.required": "La cantidad es requerida",
    }),

    attributes: Joi.object({
      size: Joi.string().allow("", null).optional(),
      color: Joi.string().allow("", null).optional(),
      material: Joi.string().allow("", null).optional(),
    }).default({}),
  }),
};

const removeItemValidation = {
  params: Joi.object({
    productId: Joi.string().required(),
  }),
  body: Joi.object({
    attributes: Joi.object({
      size: Joi.string().allow("", null).optional(),
      color: Joi.string().allow("", null).optional(),
      material: Joi.string().allow("", null).optional(),
    }).default({}),
  }),
};

const applyCouponValidation = {
  body: Joi.object({
    code: Joi.string().required().uppercase().trim().max(20).messages({
      "any.required": "El código de cupón es requerido",
    }),
  }),
};

const updateShippingAddressValidation = {
  body: Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    email: Joi.string().email().required(),
    phone: Joi.string().required(),
    street: Joi.string().required(),
    city: Joi.string().required(),
    state: Joi.string().required(),
    zipCode: Joi.string().required(),
    country: Joi.string().required(),
    isDefault: Joi.boolean().optional(),
  }).min(1),
};

const updateShippingMethodValidation = {
  body: Joi.object({
    method: Joi.string()
      .valid("standard", "express", "overnight", "pickup")
      .required(),
    cost: Joi.number().min(0).optional(),
  }),
};

const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    stripUnknown: true,
  };

  if (schema.params) {
    const { error } = schema.params.validate(req.params, validationOptions);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors: error.details.map((d) => d.message),
      });
    }
  }

  if (schema.body) {
    const { error, value } = schema.body.validate(req.body, validationOptions);
    if (error) {
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors: error.details.map((d) => d.message),
      });
    }
    req.body = value;
  }

  next();
};

module.exports = {
  addItemValidation,
  updateQuantityValidation,
  removeItemValidation,
  applyCouponValidation,
  updateShippingAddressValidation,
  updateShippingMethodValidation,
  validate,
};
