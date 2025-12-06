const ApiError = require("./ApiError");

/**
 * @function errorConverter
 * @description Convierte errores de Mongoose y otros en instancias de ApiError
 *
 * Maneja:
 * - Errores de validación de Mongoose
 * - Errores de duplicados (código 11000)
 * - Errores de Cast (IDs MongoDB inválidos)
 * - Errores JWT
 * - Errores genéricos de Node.js
 *
 * @param {Error} err - Error a convertir
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Siguiente middleware
 */
const errorConverter = (err, req, res, next) => {
  let error = err;

  // Si ya es ApiError, pasar al siguiente middleware
  if (error instanceof ApiError) {
    return next(error);
  }

  let statusCode = 500;
  let message = error.message || "Error interno del servidor";
  let isOperational = false;

  // Error de validación de Mongoose
  if (error.name === "ValidationError") {
    const messages = Object.values(error.errors)
      .map((e) => e.message)
      .join("; ");
    statusCode = 400;
    message = messages;
    isOperational = true;
  }
  // Error de duplicado (unique constraint violado)
  else if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    statusCode = 409;
    message = `${field.charAt(0).toUpperCase() + field.slice(1)} ya existe en el sistema`;
    isOperational = true;
  }
  // Error de CastError (ID inválido en MongoDB)
  else if (error.name === "CastError") {
    statusCode = 400;
    message = `${error.path} inválido`;
    isOperational = true;
  }
  // Error de CORS
  else if (error.message && error.message.includes("no permitido por CORS")) {
    statusCode = 403;
    message = "Origen no permitido por CORS";
    isOperational = true;
  }
  // Error de JWT expirado
  else if (error.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expirado";
    isOperational = true;
  }
  // Error de JWT inválido
  else if (error.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Token inválido";
    isOperational = true;
  }
  // Error de Multer (subida de archivos)
  else if (error.name === "MulterError") {
    statusCode = 400;
    if (error.code === "LIMIT_FILE_SIZE") {
      message = "El archivo es demasiado grande. Máximo 5MB permitido.";
    } else if (error.code === "LIMIT_FILE_COUNT") {
      message = "Demasiados archivos. Máximo 1 archivo permitido.";
    } else {
      message = error.message;
    }
    isOperational = true;
  }
  // Errores de naturaleza desconocida
  else {
    statusCode = error.statusCode || 500;
    isOperational = error.statusCode ? true : false;
  }

  error = new ApiError(statusCode, message, isOperational, err.stack);
  next(error);
};

/**
 * @function errorHandler
 * @description Middleware global que envía errores al cliente en formato JSON
 *
 * Responde con:
 * - success: false
 * - message: descripción del error
 * - statusCode: código HTTP
 * - stack: solo en desarrollo
 *
 * En producción, no expone detalles de errores no operacionales (internos)
 *
 * @param {Error} err - Error a manejar
 * @param {Object} req - Request de Express
 * @param {Object} res - Response de Express
 * @param {Function} next - Siguiente middleware
 */
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // En producción, no exponer detalles de errores no operacionales
  if (!err.isOperational && process.env.NODE_ENV === "production") {
    statusCode = 500;
    message = "Error interno del servidor";
  }

  res.locals.errorMessage = message;

  // Construir respuesta de error
  const response = {
    success: false,
    message,
    statusCode,
  };

  // En desarrollo, incluir stack trace para debugging
  if (process.env.NODE_ENV === "development") {
    response.stack = err.stack;
    console.error("[ERROR]", {
      statusCode,
      message,
      stack: err.stack,
      path: req.path,
      method: req.method,
    });
  }

  // En producción, log mínimo
  if (process.env.NODE_ENV === "production" && !err.isOperational) {
    console.error("[CRITICAL ERROR]", {
      statusCode,
      message,
      path: req.path,
      timestamp: new Date().toISOString(),
    });
  }

  res.status(statusCode).json(response);
};

module.exports = {
  errorConverter,
  errorHandler,
};
