/**
 * @class ApiError
 * @description Clase personalizada para errores API siguiendo patrones profesionales
 * 
 * Hereda de Error y añade statusCode e isOperational
 * Permite errores operacionales vs errores inesperados
 * 
 * @example
 * throw ApiError.badRequest('El email es requerido');
 * throw ApiError.unauthorized('Token expirado');
 * throw ApiError.forbidden('No tienes permisos');
 * throw ApiError.conflict('El email ya existe');
 * throw ApiError.notFound('Usuario no encontrado');
 * throw ApiError.internalServer('Error en la base de datos');
 */

class ApiError extends Error {
  /**
   * @constructor
   * @param {number} statusCode - Código HTTP
   * @param {string} message - Mensaje de error
   * @param {boolean} isOperational - Si es error operacional (conocido)
   * @param {string} stack - Stack trace
   */
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  /**
   * @static badRequest
   * @description Error 400 - Solicitud inválida
   * @param {string} message
   * @returns {ApiError}
   */
  static badRequest(message = 'Solicitud inválida') {
    return new ApiError(400, message, true);
  }

  /**
   * @static unauthorized
   * @description Error 401 - No autenticado
   * @param {string} message
   * @returns {ApiError}
   */
  static unauthorized(message = 'No autenticado') {
    return new ApiError(401, message, true);
  }

  /**
   * @static forbidden
   * @description Error 403 - Acceso denegado
   * @param {string} message
   * @returns {ApiError}
   */
  static forbidden(message = 'Acceso denegado') {
    return new ApiError(403, message, true);
  }

  /**
   * @static notFound
   * @description Error 404 - No encontrado
   * @param {string} message
   * @returns {ApiError}
   */
  static notFound(message = 'Recurso no encontrado') {
    return new ApiError(404, message, true);
  }

  /**
   * @static conflict
   * @description Error 409 - Conflicto (recurso duplicado)
   * @param {string} message
   * @returns {ApiError}
   */
  static conflict(message = 'El recurso ya existe') {
    return new ApiError(409, message, true);
  }

  /**
   * @static unprocessable
   * @description Error 422 - Entidad no procesable
   * @param {string} message
   * @returns {ApiError}
   */
  static unprocessable(message = 'Entidad no procesable') {
    return new ApiError(422, message, true);
  }

  /**
   * @static tooManyRequests
   * @description Error 429 - Demasiadas solicitudes
   * @param {string} message
   * @returns {ApiError}
   */
  static tooManyRequests(message = 'Demasiadas solicitudes. Intenta más tarde.') {
    return new ApiError(429, message, true);
  }

  /**
   * @static internalServer
   * @description Error 500 - Error interno del servidor
   * @param {string} message
   * @returns {ApiError}
   */
  static internalServer(message = 'Error interno del servidor') {
    return new ApiError(500, message, false);
  }
}

module.exports = ApiError;