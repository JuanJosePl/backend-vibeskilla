const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const ApiError = require('../errors/ApiError');

/**
 * @description Configuraciones de rate limiting para diferentes endpoints
 * 
 * Previene:
 * - Ataques de fuerza bruta
 * - Spam
 * - DDoS
 * - Abuso de API
 */

/**
 * Rate limiter general para API
 * 100 requests por 15 minutos por IP
 */
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100,
  message: {
    success: false,
    message: 'Demasiadas solicitudes desde esta IP. Por favor, intenta más tarde.'
  },
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  handler: (req, res) => {
    throw ApiError.badRequest('Demasiadas solicitudes. Por favor, intenta más tarde.');
  }
});

/**
 * Rate limiter estricto para autenticación
 * 5 intentos por 15 minutos por IP
 */
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true, // No contar requests exitosos
  message: {
    success: false,
    message: 'Demasiados intentos de login. Por favor, intenta en 15 minutos.'
  },
  handler: (req, res) => {
    throw ApiError.badRequest('Demasiados intentos de login. Cuenta bloqueada temporalmente.');
  }
});

/**
 * Rate limiter para creación de recursos
 * 20 creaciones por hora por IP
 */
const createLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 20,
  message: {
    success: false,
    message: 'Límite de creación alcanzado. Intenta en 1 hora.'
  },
  handler: (req, res) => {
    throw ApiError.badRequest('Has alcanzado el límite de creación. Espera 1 hora.');
  }
});

/**
 * Rate limiter para búsquedas
 * 50 búsquedas por 10 minutos por IP
 */
const searchLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 50,
  message: {
    success: false,
    message: 'Demasiadas búsquedas. Espera 10 minutos.'
  }
});

/**
 * Rate limiter para emails
 * 3 emails por hora por IP
 */
const emailLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: {
    success: false,
    message: 'Límite de envío de emails alcanzado. Intenta en 1 hora.'
  },
  handler: (req, res) => {
    throw ApiError.badRequest('Has alcanzado el límite de envío de emails.');
  }
});

/**
 * Rate limiter para uploads
 * 10 uploads por hora por usuario
 */
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  keyGenerator: (req) => {
    // Limitar por usuario autenticado, no por IP
    return req.user?._id?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Límite de uploads alcanzado. Intenta en 1 hora.'
  }
});

/**
 * Rate limiter para checkout
 * 5 checkouts por hora por usuario
 */
const checkoutLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    return req.user?._id?.toString() || req.ip;
  },
  message: {
    success: false,
    message: 'Demasiados intentos de checkout. Intenta más tarde.'
  }
});

/**
 * Rate limiter flexible por usuario
 * Usa Redis si está disponible, sino memoria
 */
const createUserRateLimiter = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000,
    max = 100,
    message = 'Límite de solicitudes alcanzado'
  } = options;

  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message
    },
    keyGenerator: (req) => {
      return req.user?._id?.toString() || req.ip;
    },
    standardHeaders: true,
    legacyHeaders: false
  });

//   // Si tienes Redis configurado, usa RedisStore
//   if (process.env.REDIS_URL) {
//     const redis = require('redis');
//     const client = redis.createClient({
//       url: process.env.REDIS_URL
//     });
    
//     config.store = new RedisStore({
//       client,
//       prefix: 'rl:'
//     });
//   }

//   return rateLimit(config);
};

/**
 * Rate limiter específico por endpoint
 */
const createCustomLimiter = (windowMs, max, message) => {
  return rateLimit({
    windowMs,
    max,
    message: {
      success: false,
      message: message || 'Límite de solicitudes alcanzado'
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      throw ApiError.badRequest(message || 'Límite de solicitudes alcanzado');
    }
  });
};

/**
 * Middleware para aplicar rate limiting condicional
 */
const conditionalRateLimiter = (limiter, condition) => {
  return (req, res, next) => {
    if (condition(req)) {
      return limiter(req, res, next);
    }
    next();
  };
};

/**
 * Ejemplo: No aplicar rate limit a admins
 */
const rateLimitExceptAdmin = (limiter) => {
  return conditionalRateLimiter(limiter, (req) => {
    return req.user?.role !== 'admin';
  });
};

module.exports = {
  apiLimiter,
  authLimiter,
  createLimiter,
  searchLimiter,
  emailLimiter,
  uploadLimiter,
  checkoutLimiter,
  createUserRateLimiter,
  createCustomLimiter,
  conditionalRateLimiter,
  rateLimitExceptAdmin
};