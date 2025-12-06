const winston = require('winston');
const path = require('path');
const fs = require('fs');

/**
 * @description Logger profesional con Winston
 * 
 * Niveles:
 * - error: Errores críticos
 * - warn: Advertencias
 * - info: Información general
 * - http: Logs HTTP
 * - debug: Debugging
 */

// Crear directorio logs si no existe
const logsDir = path.join(__dirname, '../../../logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Definir formato personalizado
const customFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, stack }) => {
    if (stack) {
      return `${timestamp} [${level.toUpperCase()}]: ${message}\n${stack}`;
    }
    return `${timestamp} [${level.toUpperCase()}]: ${message}`;
  })
);

// Crear logger
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  transports: [
    // Escribir todos los logs en archivo combined.log
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5
    }),
    // Escribir errores en archivo error.log
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      maxsize: 5242880,
      maxFiles: 5
    })
  ]
});

// En desarrollo, también log a consola con colores
if (process.env.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  );
}

/**
 * Wrapper para logs de errores de BD
 */
logger.logDbError = (operation, error, metadata = {}) => {
  logger.error(`Database Error - ${operation}`, {
    error: error.message,
    stack: error.stack,
    ...metadata
  });
};

/**
 * Wrapper para logs de requests HTTP
 */
logger.logRequest = (req, statusCode, responseTime) => {
  logger.http(`${req.method} ${req.originalUrl} ${statusCode} - ${responseTime}ms`, {
    ip: req.ip,
    user: req.user?._id,
    userAgent: req.headers['user-agent']
  });
};

/**
 * Wrapper para logs de autenticación
 */
logger.logAuth = (action, userId, success, metadata = {}) => {
  const level = success ? 'info' : 'warn';
  logger[level](`Auth - ${action}`, {
    userId,
    success,
    ...metadata
  });
};

/**
 * Wrapper para logs de negocios
 */
logger.logBusiness = (action, metadata = {}) => {
  logger.info(`Business - ${action}`, metadata);
};

module.exports = logger;