const Joi = require('joi');

/**
 * @description Validaciones para el módulo AUTH
 * 
 * Patrones de validación:
 * - Email: RFC 5322 simplified
 * - Password: Al menos 6 chars, idealmente con mayús, minús, números
 * - Nombre: 2-50 caracteres, sin caracteres especiales
 * - Teléfono: Solo números y caracteres permitidos internacionales
 * 
 * Validaciones se aplican en la capa de HTTP (express-validator)
 * Las del modelo se aplican en la capa de persistencia
 */

// ========== CONSTANTES DE VALIDACIÓN ==========
const PASSWORD_MIN_LENGTH = 6;
const PASSWORD_STRONG_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/;
const NAME_PATTERN = /^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]{2,50}$/;
const PHONE_PATTERN = /^[0-9\s\-\+$$$$]{7,20}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ========== ESQUEMA: REGISTRO ==========

/**
 * Validación para registro de usuario
 * 
 * Reglas:
 * - Email debe ser único (verificado en service)
 * - Password mínimo 6 caracteres (recomendado: contraseña fuerte)
 * - Nombre y apellido requeridos
 * - Teléfono opcional
 */
const registerValidation = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .max(100)
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'El email es requerido',
        'string.max': 'Email muy largo'
      }),

    password: Joi.string()
      .min(PASSWORD_MIN_LENGTH)
      .required()
      .messages({
        'string.min': `La contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
        'any.required': 'La contraseña es requerida'
      }),

    firstName: Joi.string()
      .trim()
      .max(50)
      .required()
      .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/)
      .messages({
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'any.required': 'El nombre es requerido',
        'string.pattern.base': 'El nombre contiene caracteres inválidos'
      }),

    lastName: Joi.string()
      .trim()
      .max(50)
      .required()
      .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/)
      .messages({
        'string.max': 'El apellido no puede exceder 50 caracteres',
        'any.required': 'El apellido es requerido',
        'string.pattern.base': 'El apellido contiene caracteres inválidos'
      }),

    phone: Joi.string()
      .trim()
      .pattern(PHONE_PATTERN)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Teléfono inválido (7-20 caracteres, solo números y símbolos permitidos)'
      })
  })
  .required()
  .unknown(false) // Rechazar campos desconocidos
};

// ========== ESQUEMA: LOGIN ==========

/**
 * Validación para login
 * 
 * Reglas:
 * - Email y contraseña requeridos
 * - Sin restricciones de fortaleza en validación (se valida contra BD)
 */
const loginValidation = {
  body: Joi.object({
    email: Joi.string()
      .email()
      .required()
      .lowercase()
      .trim()
      .messages({
        'string.email': 'Email inválido',
        'any.required': 'El email es requerido'
      }),

    password: Joi.string()
      .required()
      .messages({
        'any.required': 'La contraseña es requerida'
      })
  })
  .required()
  .unknown(false)
};

// ========== ESQUEMA: ACTUALIZAR PERFIL ==========

/**
 * Validación para actualizar perfil
 * 
 * Reglas:
 * - Al menos un campo debe ser enviado
 * - Solo permite actualizar firstName, lastName, phone
 */
const updateProfileValidation = {
  body: Joi.object({
    firstName: Joi.string()
      .trim()
      .max(50)
      .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/)
      .optional()
      .messages({
        'string.max': 'El nombre no puede exceder 50 caracteres',
        'string.pattern.base': 'El nombre contiene caracteres inválidos'
      }),

    lastName: Joi.string()
      .trim()
      .max(50)
      .pattern(/^[a-zA-ZáéíóúñÁÉÍÓÚÑ\s'-]+$/)
      .optional()
      .messages({
        'string.max': 'El apellido no puede exceder 50 caracteres',
        'string.pattern.base': 'El apellido contiene caracteres inválidos'
      }),

    phone: Joi.string()
      .trim()
      .pattern(PHONE_PATTERN)
      .allow('', null)
      .optional()
      .messages({
        'string.pattern.base': 'Teléfono inválido'
      })
  })
  .required()
  .min(1) // Al menos un campo
  .unknown(false)
};

// ========== ESQUEMA: REFRESH TOKEN ==========

/**
 * Validación para refrescar token
 */
const refreshTokenValidation = {
  body: Joi.object({
    refreshToken: Joi.string()
      .required()
      .messages({
        'any.required': 'Refresh token es requerido'
      })
  })
  .required()
  .unknown(false)
};

// ========== ESQUEMA: CAMBIAR CONTRASEÑA ==========

/**
 * Validación para cambiar contraseña
 */
const changePasswordValidation = {
  body: Joi.object({
    currentPassword: Joi.string()
      .required()
      .messages({
        'any.required': 'La contraseña actual es requerida'
      }),

    newPassword: Joi.string()
      .min(PASSWORD_MIN_LENGTH)
      .required()
      .messages({
        'string.min': `La nueva contraseña debe tener al menos ${PASSWORD_MIN_LENGTH} caracteres`,
        'any.required': 'La nueva contraseña es requerida'
      }),

    confirmPassword: Joi.string()
      .valid(Joi.ref('newPassword'))
      .required()
      .messages({
        'any.only': 'Las contraseñas no coinciden',
        'any.required': 'Confirmación de contraseña es requerida'
      })
  })
  .required()
  .unknown(false)
};

// ========== MIDDLEWARE: VALIDADOR ==========

/**
 * Middleware de validación genérico para Joi
 * 
 * Uso:
 * router.post('/register', validate(registerValidation), controller.register);
 * 
 * @param {Object} schema - Schema de Joi
 * @returns {Function} Middleware de Express
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.body.validate(req.body, {
    abortEarly: false, // Retornar todos los errores
    stripUnknown: true, // Remover campos no especificados
    convert: true // Convertir tipos si es posible
  });

  if (error) {
    const errors = error.details.map(detail => ({
      field: detail.path.join('.'),
      message: detail.message
    }));

    return res.status(400).json({
      success: false,
      message: 'Errores de validación',
      errors
    });
  }

  next();
};

module.exports = {
  registerValidation,
  loginValidation,
  updateProfileValidation,
  refreshTokenValidation,
  changePasswordValidation,
  validate
};