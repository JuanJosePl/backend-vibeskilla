const jwt = require('jsonwebtoken');
const ApiError = require('../errors/ApiError');

/**
 * @function generateAccessToken
 * @description Genera un JWT token de acceso (corta duración)
 * 
 * @param {string} userId - ID del usuario
 * @param {string} role - Rol del usuario
 * @param {string} expiresIn - Tiempo de expiración (default: 15m)
 * @returns {string} JWT token
 * @throws {Error} Si JWT_SECRET no está configurado
 */
const generateAccessToken = (userId, role = 'customer', expiresIn = '1h') => {
  if (!process.env.JWT_SECRET) {
    throw ApiError.internalServer('JWT_SECRET no configurado');
  }

  return jwt.sign(
    { 
      id: userId,
      role,
      type: 'access'
    },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' }
  );
};

/**
 * @function generateRefreshToken
 * @description Genera un JWT token de refresco (larga duración)
 * 
 * @param {string} userId - ID del usuario
 * @param {string} expiresIn - Tiempo de expiración (default: 30d)
 * @returns {string} JWT token
 * @throws {Error} Si JWT_SECRET no está configurado
 */
const generateRefreshToken = (userId, expiresIn = '30d') => {
  if (!process.env.JWT_SECRET) {
    throw ApiError.internalServer('JWT_SECRET no configurado');
  }

  return jwt.sign(
    { 
      id: userId,
      type: 'refresh'
    },
    process.env.JWT_SECRET,
    { expiresIn, algorithm: 'HS256' }
  );
};

/**
 * @function generateTokens
 * @description Genera ambos tokens (access + refresh)
 * 
 * @param {string} userId - ID del usuario
 * @param {string} role - Rol del usuario
 * @returns {Object} { accessToken, refreshToken }
 */
const generateTokens = (userId, role = 'customer') => {
  const accessToken = generateAccessToken(userId, role);
  const refreshToken = generateRefreshToken(userId);

  return {
    accessToken,
    refreshToken
  };
};

/**
 * @function verifyToken
 * @description Verifica y decodifica un JWT token
 * 
 * @param {string} token - JWT token
 * @param {string} type - Tipo de token a verificar ('access' o 'refresh')
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido o ha expirado
 */
const verifyToken = (token, type = 'access') => {
  if (!process.env.JWT_SECRET) {
    throw ApiError.internalServer('JWT_SECRET no configurado');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: ['HS256'] });

    // Validar tipo de token
    if (decoded.type !== type) {
      throw ApiError.unauthorized(`Token type inválido. Esperado: ${type}`);
    }

    return decoded;
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      throw ApiError.unauthorized('Token expirado');
    }
    if (error.name === 'JsonWebTokenError') {
      throw ApiError.unauthorized('Token inválido');
    }
    throw error;
  }
};

/**
 * @function decodeToken
 * @description Decodifica un JWT sin verificar la firma (solo para inspección)
 * 
 * Usar solo en casos especiales. Normalmente usa verifyToken()
 * 
 * @param {string} token - JWT token
 * @returns {Object} Payload decodificado sin verificación
 */
const decodeToken = (token) => {
  return jwt.decode(token);
};


/**
 * @function refreshAccessToken
 * @description Genera nuevo access token usando refresh token
 * 
 * IMPORTANTE: Esta función debe usarse con validación de usuario en el service
 * 
 * @param {string} refreshToken - Refresh token válido
 * @returns {Object} { accessToken }
 * @throws {ApiError} Si el refresh token es inválido
 * 
 * @example
 * const result = refreshAccessToken(refreshToken);
 * // { accessToken: 'nuevo_token_jwt' }
 */
const refreshAccessToken = (refreshToken) => {
  try {
    // Verificar que el refresh token es válido y del tipo correcto
    const decoded = verifyToken(refreshToken, 'refresh');
    
    // NOTA: Aquí solo verificamos el token JWT
    // La verificación del usuario (existe, está activo, etc.) 
    // debe hacerse en el SERVICE (auth.service.js)
    
    // Generar nuevo access token con el role almacenado (si existe)
    return generateAccessToken(decoded.id, decoded.role || 'customer');
  } catch (error) {
    throw ApiError.unauthorized('Refresh token inválido o expirado');
  }
};




module.exports = {
  generateAccessToken,
  generateRefreshToken,
  generateTokens,
  verifyToken,
  decodeToken,
  refreshAccessToken 
};