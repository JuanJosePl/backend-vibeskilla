const Joi = require("joi");

/**
 * Validaciones para el módulo CATEGORIES
 */

const createCategoryValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      "string.min": "El nombre debe tener al menos 2 caracteres",
      "string.max": "El nombre no puede exceder 100 caracteres",
      "any.required": "El nombre es requerido",
    }),

    description: Joi.string().trim().max(1000).allow("", null).messages({
      "string.max": "La descripción no puede exceder 1000 caracteres",
    }),

    parentCategory: Joi.string().allow(null).optional().messages({
      "string.guid": "ID de categoría padre inválido",
    }),

    images: Joi.object({
      thumbnail: Joi.string().uri().allow(null),
      hero: Joi.string().uri().allow(null),
      icon: Joi.string().uri().allow(null),
    }).optional(),

    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string().max(50)).optional(),
      ogImage: Joi.string().uri().optional(),
      ogDescription: Joi.string().optional(),
    }).optional(),

    featured: Joi.boolean().optional(),
    order: Joi.number().integer().min(0).optional(),
  }),
};

const updateCategoryValidation = {
  params: Joi.object({
    id: Joi.string().required(),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional(),
    description: Joi.string().trim().max(1000).allow("", null).optional(),
    parentCategory: Joi.string().allow(null).optional(),
    images: Joi.object({
      thumbnail: Joi.string().uri().allow(null),
      hero: Joi.string().uri().allow(null),
      icon: Joi.string().uri().allow(null),
    }).optional(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60).optional(),
      metaDescription: Joi.string().max(160).optional(),
      keywords: Joi.array().items(Joi.string().max(50)).optional(),
      ogImage: Joi.string().uri().optional(),
      ogDescription: Joi.string().optional(),
    }).optional(),
    featured: Joi.boolean().optional(),
    order: Joi.number().integer().min(0).optional(),
    isActive: Joi.boolean().optional(),
    status: Joi.string().valid("active", "archived", "draft").optional(),
  }).min(1),
};

const slugValidation = {
  params: Joi.object({
    slug: Joi.string().required(),
  }),
};

const idValidation = {
  params: Joi.object({
    id: Joi.string().required(),
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
  createCategoryValidation,
  updateCategoryValidation,
  slugValidation,
  idValidation,
  validate,
};