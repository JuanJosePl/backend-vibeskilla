/**
 * @description Middleware de manejo de errores
 * 
 * Este archivo redirige a la nueva ubicación en core/errors/errorHandler.js
 * Se mantiene por compatibilidad con código legacy
 */

const { errorConverter, errorHandler } = require('../core/errors/errorHandler');

module.exports = {
  errorConverter,
  errorHandler
};