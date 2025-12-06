const Joi = require("joi")

/**
 * @description Validaciones profesionales para PRODUCTS
 * 100% consistente con product.model.js
 */

const createProductValidation = {
  body: Joi.object({
    name: Joi.string().trim().min(3).max(120).required().messages({
      "string.min": "El nombre debe tener al menos 3 caracteres",
      "string.max": "El nombre no puede tener más de 120 caracteres",
      "any.required": "El nombre del producto es requerido",
    }),

    slug: Joi.string().lowercase().optional(),

    description: Joi.string().min(10).max(5000).required().messages({
      "string.min": "La descripción debe tener al menos 10 caracteres",
      "string.max": "La descripción no puede tener más de 5000 caracteres",
      "any.required": "La descripción es requerida",
    }),

    shortDescription: Joi.string().max(300).optional().allow(""),

    price: Joi.number().positive().required().messages({
      "number.positive": "El precio debe ser mayor a 0",
      "any.required": "El precio es requerido",
    }),

    comparePrice: Joi.number()
      .positive()
      .optional()
      .when("price", {
        is: Joi.number().required(),
        then: Joi.number().min(Joi.ref("price")).messages({
          "number.min": "El precio de comparación debe ser mayor que el precio",
        }),
      }),

    costPrice: Joi.number()
      .positive()
      .optional()
      .when("price", {
        is: Joi.number().required(),
        then: Joi.number().max(Joi.ref("price")).messages({
          "number.max": "El precio de costo debe ser menor que el precio de venta",
        }),
      }),

    sku: Joi.string().uppercase().optional(),

    stock: Joi.number().integer().min(0).default(0),

    lowStockThreshold: Joi.number().integer().min(0).default(5),

    trackQuantity: Joi.boolean().default(true),

    allowBackorder: Joi.boolean().default(false),

    categories: Joi.array().items(Joi.string()).optional(),

    mainCategory: Joi.string().allow("", null).optional(),

    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),

    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          altText: Joi.string().max(200).allow(""),
          title: Joi.string().optional(),
          isPrimary: Joi.boolean().default(false),
          order: Joi.number().optional(),
        }),
      )
      .optional(),

    brand: Joi.string().trim().max(100).allow(""),

    attributes: Joi.object({
      size: Joi.array().items(Joi.string()).optional(),
      color: Joi.array().items(Joi.string()).optional(),
      material: Joi.array().items(Joi.string()).optional(),
      weight: Joi.string().optional(),
      dimensions: Joi.object({
        length: Joi.number().optional(),
        width: Joi.number().optional(),
        height: Joi.number().optional(),
        unit: Joi.string().default("cm"),
      }).optional(),
    }).optional(),

    variants: Joi.array()
      .items(
        Joi.object({
          sku: Joi.string().required(),
          name: Joi.string().optional(),
          price: Joi.number().positive().optional(),
          comparePrice: Joi.number().positive().optional(),
          stock: Joi.number().integer().min(0).optional(),
          attributes: Joi.object({
            size: Joi.string().optional(),
            color: Joi.string().optional(),
            material: Joi.string().optional(),
          }),
          images: Joi.array().items(Joi.string().uri()).optional(),
          isActive: Joi.boolean().default(true),
        }),
      )
      .optional(),

    seo: Joi.object({
      title: Joi.string().max(60).optional(),
      description: Joi.string().max(160).optional(),
      metaKeywords: Joi.array().items(Joi.string()).optional(),
      canonicalUrl: Joi.string().uri().optional(),
    }).optional(),

    status: Joi.string().valid("active", "draft", "archived", "discontinued").default("draft"),

    visibility: Joi.string().valid("public", "private", "hidden").default("public"),

    isFeatured: Joi.boolean().default(false),

    isPublished: Joi.boolean().default(false),

    requiresShipping: Joi.boolean().default(true),

    weight: Joi.object({
      value: Joi.number().positive().optional(),
      unit: Joi.string().default("kg"),
    }).optional(),
  }).min(3), // Al menos 3 campos obligatorios
}

const updateProductValidation = {
  params: Joi.object({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "ID de producto inválido",
      }),
  }),
  body: Joi.object({
    name: Joi.string().trim().min(3).max(120).optional(),
    slug: Joi.string().lowercase().optional(),
    description: Joi.string().min(10).max(5000).optional(),
    shortDescription: Joi.string().max(300).optional().allow(""),
    price: Joi.number().positive().optional(),
    comparePrice: Joi.number().positive().optional(),
    costPrice: Joi.number().positive().optional(),
    sku: Joi.string().uppercase().optional(),
    stock: Joi.number().integer().min(0).optional(),
    lowStockThreshold: Joi.number().integer().min(0).optional(),
    trackQuantity: Joi.boolean().optional(),
    allowBackorder: Joi.boolean().optional(),
    categories: Joi.array().items(Joi.string()).optional(),
    mainCategory: Joi.string().allow("", null).optional(),
    tags: Joi.array().items(Joi.string().trim().lowercase()).optional(),
    images: Joi.array()
      .items(
        Joi.object({
          url: Joi.string().uri().required(),
          altText: Joi.string().max(200).allow(""),
          isPrimary: Joi.boolean(),
          order: Joi.number(),
        }),
      )
      .optional(),
    brand: Joi.string().trim().max(100).optional(),
    attributes: Joi.object().optional(),
    variants: Joi.array().optional(),
    seo: Joi.object().optional(),
    status: Joi.string().valid("active", "draft", "archived", "discontinued").optional(),
    visibility: Joi.string().valid("public", "private", "hidden").optional(),
    isFeatured: Joi.boolean().optional(),
    isPublished: Joi.boolean().optional(),
    requiresShipping: Joi.boolean().optional(),
    weight: Joi.object().optional(),
  }).min(1),
}

const getProductsValidation = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(12),
    sort: Joi.string()
      .valid("createdAt", "price", "name", "salesCount", "views", "rating.average")
      .default("createdAt"),
    order: Joi.string().valid("asc", "desc").default("desc"),
    category: Joi.string().optional(),
    search: Joi.string().min(2).max(100).optional(),
    minPrice: Joi.number().min(0).optional(),
    maxPrice: Joi.number().min(0).optional(),
    status: Joi.string().valid("active", "draft", "archived").default("active"),
    visibility: Joi.string().valid("public", "private", "hidden").default("public"),
    featured: Joi.boolean().optional(),
    inStock: Joi.boolean().optional(),
    brand: Joi.string().optional(),
  }),
}

const idValidation = {
  params: Joi.object({
    id: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required()
      .messages({
        "string.pattern.base": "ID inválido",
      }),
  }),
}

const slugValidation = {
  params: Joi.object({
    slug: Joi.string().required(),
  }),
}

const checkStockValidation = {
  params: Joi.object({
    productId: Joi.string()
      .regex(/^[0-9a-fA-F]{24}$/)
      .required(),
  }),
  body: Joi.object({
    quantity: Joi.number().integer().positive().required(),
  }),
}

/**
 * Middleware para validar requests
 */
const validate = (schema) => (req, res, next) => {
  const validationOptions = {
    abortEarly: false,
    stripUnknown: true,
    messages: {
      "number.positive": "{#label} debe ser un número positivo",
      "string.email": "{#label} debe ser un email válido",
      "any.required": "{#label} es requerido",
    },
  }

  // Validar params
  if (schema.params) {
    const { error } = schema.params.validate(req.params, validationOptions)
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
      }))
      return res.status(400).json({
        success: false,
        message: "Errores de validación en parámetros",
        errors,
      })
    }
  }

  // Validar query
  if (schema.query) {
    const { error, value } = schema.query.validate(req.query, validationOptions)
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
      }))
      return res.status(400).json({
        success: false,
        message: "Errores de validación en query",
        errors,
      })
    }
    req.query = value
  }

  // Validar body
  if (schema.body) {
    const { error, value } = schema.body.validate(req.body, validationOptions)
    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.context.key,
        message: detail.message,
      }))
      return res.status(400).json({
        success: false,
        message: "Errores de validación",
        errors,
      })
    }
    req.body = value
  }

  next()
}

module.exports = {
  createProductValidation,
  updateProductValidation,
  getProductsValidation,
  slugValidation,
  idValidation,
  checkStockValidation,
  validate,
}
