/**
 * @description Configuración de JWT
 * 
 * Este archivo redirige a la nueva ubicación en core/utils/generateToken.js
 * Se mantiene por compatibilidad con código legacy
 */

const {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken
} = require('../core/utils/generateToken');

module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken
};