/**
 * @function catchAsync
 * @description Wrapper para funciones async que captura errores automáticamente
 * 
 * Evita tener que escribir try-catch en cada controller
 * Los errores son pasados automáticamente al middleware de errores
 * 
 * @param {Function} fn - Función async del controller
 * @returns {Function} Middleware de Express
 * 
 * @example
 * const getUsers = catchAsync(async (req, res) => {
 *   const users = await userService.getUsers();
 *   res.json({ 
 *     success: true, 
 *     data: users 
 *   });
 * });
 * 
 * router.get('/users', getUsers);
 */
const catchAsync = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    // Pasar el error al middleware de errores
    next(err);
  });
};

module.exports = catchAsync;