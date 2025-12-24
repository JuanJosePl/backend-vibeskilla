// src/modules/admin/admin.validation.js

const Joi = require('joi');

/**
 * @description Validaciones para el módulo ADMIN
 * 
 * Responsabilidades:
 * - Validar query params (filtros, paginación)
 * - Validar body (actualizaciones)
 * - Validar params (IDs)
 * 
 * Patrones aplicados:
 * - Input Validation Pattern
 * - Schema Validation
 */

/** 
 * ==========================================
 * VALIDACIONES DE DASHBOARD
 * ==========================================
 */

const getSalesData = {
  query: Joi.object({
    range: Joi.string()
      .valid('daily', 'weekly', 'monthly', 'yearly')
      .default('monthly')
  })
};

/** 
 * ==========================================
 * VALIDACIONES DE PRODUCTOS
 * ==========================================
 */

const getProducts = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid('active', 'inactive', 'draft'),
    search: Joi.string().trim().min(2).max(100),
    category: Joi.string(),
    minPrice: Joi.number().min(0),
    maxPrice: Joi.number().min(0),
    sortBy: Joi.string().valid('createdAt', 'price', 'name', 'stock').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const getLowStock = {
  query: Joi.object({
    threshold: Joi.number().integer().min(1).default(10)
  })
};

const createProduct = {
  body: Joi.object({
    name: Joi.string().trim().min(3).max(150).required(),
    slug: Joi.string().lowercase().optional(),              // ✅ AGREGADO

    sku: Joi.string().trim().min(3).max(20).uppercase().required(),
    description: Joi.string().trim().min(100).max(5000).required(),
    price: Joi.number().min(0).required(),
    comparePrice: Joi.number().min(0).optional(),
    costPrice: Joi.number().min(0).optional(),
    stock: Joi.number().integer().min(0).default(0),
    categories: Joi.array().items(Joi.string()).min(1).required(),
    brand: Joi.string().trim().max(100).optional(),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        altText: Joi.string().max(200).allow("").optional(),  // ✅ CORREGIDO: alt → altText
        title: Joi.string().optional(),                       // ✅ AGREGADO
        isPrimary: Joi.boolean().default(false),
        order: Joi.number().optional()                        // ✅ AGREGADO
      })
    ).optional(),
    tags: Joi.array().items(Joi.string()).optional(),
    status: Joi.string().valid('active', 'inactive', 'draft').default('draft'),
    isFeatured: Joi.boolean().default(false),
    trackQuantity: Joi.boolean().default(true),
    allowBackorder: Joi.boolean().default(false)
  })
};

const updateProduct = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    name: Joi.string().trim().min(3).max(150),
    description: Joi.string().trim().min(10).max(5000),      // ✅ CORREGIDO: min 100 → 10
    slug: Joi.string().lowercase().optional(),              // ✅ AGREGADO

    shortDescription: Joi.string().max(300).allow(""),        // ✅ AGREGADO
    price: Joi.number().min(0),
    comparePrice: Joi.number().min(0),
    costPrice: Joi.number().min(0),
    sku: Joi.string().uppercase(),                            // ✅ AGREGADO
    stock: Joi.number().integer().min(0),
    lowStockThreshold: Joi.number().integer().min(0),         // ✅ AGREGADO
    trackQuantity: Joi.boolean(),                             // ✅ AGREGADO
    allowBackorder: Joi.boolean(),                            // ✅ AGREGADO
    categories: Joi.array().items(Joi.string()).min(1),
    mainCategory: Joi.string().allow("", null),               // ✅ AGREGADO
    brand: Joi.string().trim().max(100),
    images: Joi.array().items(
      Joi.object({
        url: Joi.string().uri().required(),
        altText: Joi.string().max(200).allow(""),             // ✅ CORREGIDO: alt → altText
        title: Joi.string().optional(),                       // ✅ AGREGADO
        isPrimary: Joi.boolean(),
        order: Joi.number()                                   // ✅ AGREGADO
      })
    ),
    tags: Joi.array().items(Joi.string()),
    attributes: Joi.object({                                  // ✅ AGREGADO
      size: Joi.array().items(Joi.string()),
      color: Joi.array().items(Joi.string()),
      material: Joi.array().items(Joi.string()),
      weight: Joi.string(),
      dimensions: Joi.object({
        length: Joi.number(),
        width: Joi.number(),
        height: Joi.number(),
        unit: Joi.string().default("cm")
      })
    }),
    variants: Joi.array().items(                              // ✅ AGREGADO
      Joi.object({
        sku: Joi.string().required(),
        name: Joi.string(),
        price: Joi.number().positive(),
        comparePrice: Joi.number().positive(),
        stock: Joi.number().integer().min(0),
        attributes: Joi.object({
          size: Joi.string(),
          color: Joi.string(),
          material: Joi.string()
        }),
        images: Joi.array().items(Joi.string().uri()),
        isActive: Joi.boolean()
      })
    ),
    seo: Joi.object({                                         // ✅ AGREGADO
      title: Joi.string().max(60),
      description: Joi.string().max(160),
      metaKeywords: Joi.array().items(Joi.string()),
      canonicalUrl: Joi.string().uri()
    }),
    status: Joi.string().valid('active', 'draft', 'archived', 'discontinued'),  // ✅ CORREGIDO: valores alineados con schema
    visibility: Joi.string().valid('public', 'private', 'hidden'),              // ✅ AGREGADO
    isFeatured: Joi.boolean(),
    isPublished: Joi.boolean(),                               // ✅ AGREGADO
    requiresShipping: Joi.boolean(),                          // ✅ AGREGADO
    weight: Joi.object({                                      // ✅ AGREGADO
      value: Joi.number().positive(),
      unit: Joi.string().default("kg")
    })
  }).min(1)
};

const deleteProduct = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

/** 
 * ==========================================
 * VALIDACIONES DE CATEGORÍAS
 * ==========================================
 */

const createCategory = {
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100).required(),
    slug: Joi.string().lowercase().optional(),              // ✅ AGREGADO
    description: Joi.string().max(500).optional().allow(''),
    parentCategory: Joi.string().optional(),
    images: Joi.object({
      thumbnail: Joi.string().uri().optional(),
      hero: Joi.string().uri().optional(),
      icon: Joi.string().uri().optional()
    }).optional(),
    seo: Joi.object({
      metaTitle: Joi.string().max(60),
      metaDescription: Joi.string().max(160),
      keywords: Joi.array().items(Joi.string())
    }).optional(),
    isFeatured: Joi.boolean().default(false),
    displayOrder: Joi.number().integer().min(0).default(0),
    status: Joi.string().valid('active', 'inactive', 'archived').default('active')
  })
};

const updateCategory = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    name: Joi.string().trim().min(2).max(100),
    slug: Joi.string().lowercase().optional(),              // ✅ AGREGADO
    description: Joi.string().max(500).allow(''),
    parentCategory: Joi.string().allow(null),
    images: Joi.object({
      thumbnail: Joi.string().uri(),
      hero: Joi.string().uri(),
      icon: Joi.string().uri()
    }),
    seo: Joi.object({
      metaTitle: Joi.string().max(60),
      metaDescription: Joi.string().max(160),
      keywords: Joi.array().items(Joi.string())
    }),
    isFeatured: Joi.boolean(),
    displayOrder: Joi.number().integer().min(0),
    status: Joi.string().valid('active', 'inactive', 'archived')
  }).min(1)
};

const deleteCategory = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

/** 
 * ==========================================
 * VALIDACIONES DE ÓRDENES
 * ==========================================
 */

const getOrders = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    ),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
    search: Joi.string().trim(),
    sortBy: Joi.string().valid('createdAt', 'totalAmount').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const getOrderDetails = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

const updateOrderStatus = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    status: Joi.string().valid(
      'pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'
    ),
    paymentStatus: Joi.string().valid('pending', 'paid', 'failed', 'refunded'),
    trackingNumber: Joi.string().trim().allow(''),
    adminNotes: Joi.string().max(1000).allow('')
  }).min(1)
};

/** 
 * ==========================================
 * VALIDACIONES DE USUARIOS
 * ==========================================
 */

const getUsers = {
  query: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20),
    role: Joi.string().valid('customer', 'admin', 'moderator'),
    search: Joi.string().trim().min(2),
    isActive: Joi.string().valid('true', 'false'),
    sortBy: Joi.string().valid('createdAt', 'lastLogin', 'email').default('createdAt'),
    sortOrder: Joi.string().valid('asc', 'desc').default('desc')
  })
};

const getUserDetails = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

const updateUser = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    role: Joi.string().valid('customer', 'admin', 'moderator'),
    isActive: Joi.boolean(),
    profile: Joi.object({
      firstName: Joi.string().trim().min(2).max(50),
      lastName: Joi.string().trim().min(2).max(50),
      phone: Joi.string().trim().pattern(/^[0-9\s\-\+$$$$]*$/)
    })
  }).min(1)
};

const toggleUserBan = {
  params: Joi.object({
    id: Joi.string().required()
  }),
  body: Joi.object({
    isBanned: Joi.boolean().required(),
    reason: Joi.string().max(500).when('isBanned', {
      is: true,
      then: Joi.required(),
      otherwise: Joi.optional().allow('')
    })
  })
};

const deleteUser = {
  params: Joi.object({
    id: Joi.string().required()
  })
};

/** 
 * ==========================================
 * MIDDLEWARE DE VALIDACIÓN
 * ==========================================
 */

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
  adminValidation: {
    // Dashboard
    getSalesData,

    // Productos
    getProducts,
    getLowStock,
    createProduct,
    updateProduct,
    deleteProduct,

    // Categorías
    createCategory,
    updateCategory,
    deleteCategory,

    // Órdenes
    getOrders,
    getOrderDetails,
    updateOrderStatus,

    // Usuarios
    getUsers,
    getUserDetails,
    updateUser,
    toggleUserBan,
    deleteUser
  }
};