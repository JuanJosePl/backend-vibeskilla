const authService = require('./auth.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class AuthController
 * @description Controlador ultra delgado para AUTH
 * 
 * Responsabilidades:
 * - Recibir req/res
 * - Llamar al service
 * - Retornar respuesta con headers de seguridad
 * - Loguear acciones críticas
 * 
 * NO debe contener lógica de negocio
 * 
 * @requires authService - Lógica de negocio
 * @requires catchAsync - Manejo de errores async
 */

/**
 * @desc    Registrar nuevo usuario
 * @route   POST /api/auth/register
 * @access  Public
 * @returns {Object} { success, message, data: { token, user } }
 * @throws  {409} Si el email ya existe
 * @throws  {400} Si la validación falla
 */
const register = catchAsync(async (req, res) => {
  const result = await authService.register(req.body);
  
  // Log de auditoría
  console.log(`[AUTH] Nuevo usuario registrado: ${result.user.email}`);
  
  res.status(201).json({
    success: true,
    message: 'Usuario registrado exitosamente',
    data: result
  });
});

/**
 * @desc    Autenticar usuario (login)
 * @route   POST /api/auth/login
 * @access  Public
 * @returns {Object} { success, message, data: { token, refreshToken, user } }
 * @throws  {401} Si las credenciales son inválidas
 * @throws  {423} Si la cuenta está bloqueada por intentos fallidos
 */
const login = catchAsync(async (req, res) => {
  const result = await authService.login(req.body);
  
  // Log de auditoría
  console.log(`[AUTH] Login exitoso: ${result.user.email}`);
  
  // Header de seguridad: No permitir caché de información sensible
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  
  res.json({
    success: true,
    message: 'Login exitoso',
    data: result
  });
});

/**
 * @desc    Obtener perfil del usuario autenticado
 * @route   GET /api/auth/profile
 * @access  Private
 * @returns {Object} { success, data: { user } }
 * @throws  {401} Si no está autenticado
 * @throws  {404} Si el usuario no existe
 */
const getProfile = catchAsync(async (req, res) => {
  // Validar que req.user existe y tiene _id
if (!req.user || !req.user._id) {
  throw ApiError.unauthorized('Usuario no autenticado correctamente');
}
  
  const user = await authService.getProfile(req.user._id);
  
  res.json({
    success: true,
    data: { user }
  });
});

/**
 * @desc    Actualizar perfil del usuario autenticado
 * @route   PUT /api/auth/profile
 * @access  Private
 * @returns {Object} { success, message, data: { user } }
 * @throws  {401} Si no está autenticado
 * @throws  {404} Si el usuario no existe
 * @throws  {400} Si la validación falla
 */
const updateProfile = catchAsync(async (req, res) => {
  // Validar que req.user existe y tiene _id
  if (!req.user || !req.user._id) {
  throw ApiError.unauthorized('Usuario no autenticado correctamente');
}
  
  const user = await authService.updateProfile(req.user._id, req.body);
  
  // Log de auditoría
  console.log(`[AUTH] Perfil actualizado: ${user.email}`);
  
  res.json({
    success: true,
    message: 'Perfil actualizado exitosamente',
    data: { user }
  });
});

/**
 * @desc    Refrescar token de acceso
 * @route   POST /api/auth/refresh-token
 * @access  Public (requiere refresh token válido en body)
 * @returns {Object} { success, message, data: { token } }
 * @throws  {401} Si el refresh token es inválido
 */
const refreshToken = catchAsync(async (req, res) => {
  const { refreshToken } = req.body;
  
  if (!refreshToken) {
    throw new Error('Refresh token es requerido');
  }
  
  const result = await authService.refreshAccessToken(refreshToken);
  
  res.json({
    success: true,
    message: 'Token refrescado exitosamente',
    data: result
  });
});

/**
 * @desc    Logout del usuario
 * @route   POST /api/auth/logout
 * @access  Private
 * @returns {Object} { success, message }
 */
const logout = catchAsync(async (req, res) => {
  // En una implementación real, invalidarías el refresh token
  // Por ahora es una notificación al cliente
  
  console.log(`[AUTH] Logout: ${req.user.email}`);
  
  res.json({
    success: true,
    message: 'Logout exitoso'
  });
});

module.exports = {
  register,
  login,
  getProfile,
  updateProfile,
  refreshToken,
  logout
};