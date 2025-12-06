const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const { 
  validate, 
  registerValidation, 
  loginValidation, 
  updateProfileValidation,
  refreshTokenValidation,
  changePasswordValidation
} = require('./auth.validation');
const { authMiddleware } = require('../../middleware/auth');

/**
 * @module authRoutes
 * @description Rutas del módulo AUTH
 * 
 * Patrones:
 * - POST: Crear recurso (register, login)
 * - GET: Leer recurso (profile)
 * - PUT: Actualizar recurso (profile)
 * - DELETE: Eliminar recurso (logout, deactivate)
 * 
 * Middleware:
 * - validate: Valida request según schema Joi
 * - authMiddleware: Verifica JWT válido
 */

// ========== RUTAS PÚBLICAS ==========

/**
 * @route   POST /api/auth/register
 * @desc    Registrar nuevo usuario
 * @access  Public
 * @body    { email, password, firstName, lastName, phone? }
 * @returns { success, message, data: { token, refreshToken, user } }
 */
router.post(
  '/register',
  validate(registerValidation),
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Iniciar sesión
 * @access  Public
 * @body    { email, password }
 * @returns { success, message, data: { token, refreshToken, user } }
 */
router.post(
  '/login',
  validate(loginValidation),
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refrescar token de acceso
 * @access  Public (requiere refresh token válido)
 * @body    { refreshToken }
 * @returns { success, message, data: { token } }
 */
router.post(
  '/refresh-token',
  validate(refreshTokenValidation),
  authController.refreshToken
);

// ========== RUTAS PRIVADAS ==========

/**
 * @route   GET /api/auth/profile
 * @desc    Obtener perfil del usuario autenticado
 * @access  Private
 * @headers { Authorization: "Bearer <token>" }
 * @returns { success, data: { user } }
 */
router.get(
  '/profile',
  authMiddleware,
  authController.getProfile
);

/**
 * @route   PUT /api/auth/profile
 * @desc    Actualizar perfil del usuario autenticado
 * @access  Private
 * @headers { Authorization: "Bearer <token>" }
 * @body    { firstName?, lastName?, phone? }
 * @returns { success, message, data: { user } }
 */
router.put(
  '/profile',
  authMiddleware,
  validate(updateProfileValidation),
  authController.updateProfile
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout del usuario (notificación al cliente)
 * @access  Private
 * @headers { Authorization: "Bearer <token>" }
 * @returns { success, message }
 */
router.post(
  '/logout',
  authMiddleware,
  authController.logout
);

module.exports = router;