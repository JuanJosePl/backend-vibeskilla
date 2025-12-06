const { verifyToken } = require('../core/utils/generateToken');
const User = require('../modules/auth/auth.model');
const ApiError = require('../core/errors/ApiError');
const catchAsync = require('../core/utils/catchAsync');

/**
 * @middleware authMiddleware
 * @description Verifica que el usuario esté autenticado
 * 
 * Valida el token JWT de acceso y adjunta el usuario a req.user
 * 
 * Pasos:
 * 1. Extraer token del header Authorization: Bearer <token>
 * 2. Verificar que el token existe
 * 3. Verificar y decodificar el JWT
 * 4. Buscar usuario en base de datos
 * 5. Validar que usuario existe y está activo
 * 6. Adjuntar usuario a req.user
 * 
 * @throws {ApiError} 401 - Si no hay token o token inválido
 * @throws {ApiError} 403 - Si la cuenta está desactivada
 * 
 * @example
 * router.get('/profile', authMiddleware, controller);
 */
const authMiddleware = catchAsync(async (req, res, next) => {
  // Extraer token del header Authorization
  const authHeader = req.header('Authorization');
  
  if (!authHeader) {
    throw ApiError.unauthorized('Acceso denegado. Header Authorization requerido.');
  }

  const token = authHeader.replace('Bearer ', '');
  
  if (!token) {
    throw ApiError.unauthorized('Acceso denegado. Token no proporcionado.');
  }

  // Verificar y decodificar token (type: 'access')
  const decoded = verifyToken(token, 'access');
  
  // Buscar usuario en base de datos
  const user = await User.findById(decoded.id);
  
  if (!user) {
    throw ApiError.unauthorized('Token inválido. Usuario no encontrado.');
  }

  // Verificar que el usuario esté activo
  if (!user.isActive) {
    throw ApiError.forbidden('Cuenta desactivada. Contacta al administrador.');
  }

  // Adjuntar usuario y token al request
  req.user = user;
  req.token = token;
  
  next();
});

/**
 * @middleware requireRole
 * @description Verifica que el usuario tenga uno de los roles permitidos
 * 
 * Debe usarse DESPUÉS de authMiddleware
 * 
 * @param {...string} roles - Roles permitidos
 * @returns {Function} Middleware
 * 
 * @throws {ApiError} 401 - Si usuario no autenticado
 * @throws {ApiError} 403 - Si rol no permitido
 * 
 * @example
 * router.delete('/users/:id', authMiddleware, requireRole('admin'), controller);
 * router.post('/moderate', authMiddleware, requireRole('admin', 'moderator'), controller);
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Usuario no autenticado');
    }

    if (!roles.includes(req.user.role)) {
      throw ApiError.forbidden(
        `Acceso denegado. Se requiere uno de estos roles: ${roles.join(', ')}`
      );
    }

    next();
  };
};

/**
 * @middleware isOwnerOrAdmin
 * @description Verifica que el usuario sea el dueño del recurso o admin
 * 
 * @param {string} paramName - Nombre del parámetro en req.params que contiene el ID (default: 'id')
 * @returns {Function} Middleware
 * 
 * @throws {ApiError} 403 - Si no es dueño ni admin
 * 
 * @example
 * router.put('/users/:id', authMiddleware, isOwnerOrAdmin('id'), controller);
 */
const isOwnerOrAdmin = (paramName = 'id') => {
  return (req, res, next) => {
    if (!req.user) {
      throw ApiError.unauthorized('Usuario no autenticado');
    }

    const resourceOwnerId = req.params[paramName];
    const userId = req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (userId !== resourceOwnerId && !isAdmin) {
      throw ApiError.forbidden('No tienes permisos para acceder a este recurso.');
    }

    next();
  };
};

module.exports = {
  authMiddleware,
  requireRole,
  isOwnerOrAdmin
};