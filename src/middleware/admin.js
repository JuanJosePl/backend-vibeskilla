const ApiError = require('../core/errors/ApiError');
const { ROLES } = require('../core/constants/roles');
const catchAsync = require('../core/utils/catchAsync');

/**
 * @middleware adminMiddleware
 * @description Verifica que el usuario sea administrador
 * 
 * Debe usarse DESPUÉS de authMiddleware
 * 
 * @throws {ApiError} 401 - Si usuario no autenticado
 * @throws {ApiError} 403 - Si no es admin
 * 
 * @example
 * router.delete('/users/:id', authMiddleware, adminMiddleware, controller);
 */
const adminMiddleware = catchAsync((req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Usuario no autenticado');
  }

  if (req.user.role !== ROLES.ADMIN) {
    throw ApiError.forbidden(
      'Acceso denegado. Se requieren privilegios de administrador.'
    );
  }

  next();
});

/**
 * @middleware moderatorMiddleware
 * @description Verifica que el usuario sea admin o moderador
 * 
 * Debe usarse DESPUÉS de authMiddleware
 * 
 * @throws {ApiError} 401 - Si usuario no autenticado
 * @throws {ApiError} 403 - Si no es admin ni moderador
 * 
 * @example
 * router.put('/products/:id', authMiddleware, moderatorMiddleware, controller);
 */
const moderatorMiddleware = catchAsync((req, res, next) => {
  if (!req.user) {
    throw ApiError.unauthorized('Usuario no autenticado');
  }

  if (![ROLES.ADMIN, ROLES.MODERATOR].includes(req.user.role)) {
    throw ApiError.forbidden(
      'Acceso denegado. Se requieren privilegios de administrador o moderador.'
    );
  }

  next();
});

module.exports = {
  adminMiddleware,
  moderatorMiddleware
};