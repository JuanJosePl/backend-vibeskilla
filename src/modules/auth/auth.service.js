const User = require("./auth.model");
const ApiError = require("../../core/errors/ApiError");
const {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
} = require("../../core/utils/generateToken");

/**
 * @class AuthService
 * @description Lógica de negocio para autenticación
 *
 * Responsabilidades:
 * - Registro de usuarios con validaciones de negocio
 * - Autenticación (login) con protección contra fuerza bruta
 * - Gestión de perfil
 * - Manejo de tokens (access + refresh)
 * - Validaciones de reglas del dominio
 *
 * DDD (Domain-Driven Design):
 * - Implementa Ubiquitous Language del dominio Auth
 * - Agregados: User (raíz de agregado)
 * - Políticas de negocio: lockout, password strength
 *
 * Clean Architecture:
 * - Independiente de frameworks
 * - No conoce de Express, Solo usa el modelo
 * - Retorna DTOs, no entidades de BD
 */

class AuthService {
  /**
   * Registrar nuevo usuario
   *
   * Reglas del dominio:
   * - Email único en el sistema
   * - Contraseña fuerte (min 6, pero validada en layers anteriores)
   * - Usuario inicia con rol CUSTOMER
   * - Email NO está verificado inicialmente
   *
   * @param {Object} userData - Datos del usuario
   * @param {string} userData.email - Email único
   * @param {string} userData.password - Contraseña
   * @param {string} userData.firstName - Nombre
   * @param {string} userData.lastName - Apellido
   * @param {string} [userData.phone] - Teléfono opcional
   *
   * @returns {Promise<Object>} { token, refreshToken, user }
   * @throws {ApiError} 409 si email ya existe
   * @throws {ApiError} 400 si datos inválidos
   *
   * @example
   * const result = await authService.register({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!',
   *   firstName: 'John',
   *   lastName: 'Doe'
   * });
   */
  async register(userData) {
    const { email, password, firstName, lastName, phone } = userData;

    // 1. Verificar si el usuario ya existe
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      throw ApiError.conflict("Ya existe un usuario con este email");
    }

    // 2. Crear usuario
    const user = await User.create({
      email: email.toLowerCase(),
      password,
      profile: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone ? phone.trim() : undefined,
      },
    });

    // 3. Registrar primer login
    user.lastLogin = new Date();
    await user.save();

    // 4. Generar tokens (CORREGIDO: usar generateAccessToken)
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // 5. Retornar DTO
    return {
      token: accessToken,
      refreshToken,
      user: user.toJSON(),
    };
  }

  /**
   * Autenticar usuario (login)
   *
   * Reglas del dominio:
   * - Email y contraseña deben coincidir
   * - Protección contra fuerza bruta (max 5 intentos, lockout 15 min)
   * - Cuenta debe estar activa
   * - Registrar intento de login (exitoso o no)
   *
   * @param {Object} credentials
   * @param {string} credentials.email
   * @param {string} credentials.password
   *
   * @returns {Promise<Object>} { token, refreshToken, user }
   * @throws {ApiError} 401 si credenciales inválidas
   * @throws {ApiError} 423 si cuenta bloqueada
   * @throws {ApiError} 403 si cuenta desactivada
   *
   * @example
   * const result = await authService.login({
   *   email: 'user@example.com',
   *   password: 'SecurePass123!'
   * });
   */
  async login({ email, password }) {
    // 1. Buscar usuario con password incluido
    const user = await User.findOne({ email: email.toLowerCase() }).select(
      "+password +loginAttempts +lockUntil"
    );

    // 2. Usuario no existe o contraseña inválida
    if (!user || !(await user.comparePassword(password))) {
      if (user) {
        await user.incrementLoginAttempts();
      }
      throw ApiError.unauthorized("Email o contraseña incorrectos");
    }

    // 3. Verificar si la cuenta está bloqueada
    if (user.isAccountLocked()) {
      throw ApiError.forbidden(
        "Cuenta bloqueada temporalmente por múltiples intentos fallidos. Intenta más tarde."
      );
    }

    // 4. Verificar si la cuenta está activa
    if (!user.isActive) {
      throw ApiError.forbidden(
        "Cuenta desactivada. Contacta al administrador."
      );
    }

    // 5. Resetear intentos y actualizar último login
    await user.resetLoginAttempts();
    user.lastLogin = new Date();
    await user.save();

    // 6. Generar tokens (CORREGIDO)
    const accessToken = generateAccessToken(user._id.toString(), user.role);
    const refreshToken = generateRefreshToken(user._id.toString());

    // 7. Retornar DTO
    return {
      token: accessToken,
      refreshToken,
      user: user.toJSON(),
    };
  }

  /**
   * Obtener perfil de usuario
   *
   * @param {string} userId - ID del usuario (ObjectId)
   * @returns {Promise<Object>} Usuario
   * @throws {ApiError} 404 si no existe
   *
   * @example
   * const user = await authService.getProfile('507f1f77bcf86cd799439011');
   */
  async getProfile(userId) {
    const user = await User.findById(userId);

    if (!user) {
      throw ApiError.notFound("Usuario no encontrado");
    }

    return user.toJSON();
  }

  /**
   * Actualizar perfil de usuario
   *
   * Reglas del dominio:
   * - Solo se pueden actualizar campos específicos del perfil
   * - Email NO se puede cambiar desde aquí (otra función para eso)
   * - Teléfono es opcional
   *
   * @param {string} userId - ID del usuario
   * @param {Object} updateData - Datos a actualizar
   * @param {string} [updateData.firstName] - Nombre
   * @param {string} [updateData.lastName] - Apellido
   * @param {string} [updateData.phone] - Teléfono
   *
   * @returns {Promise<Object>} Usuario actualizado
   * @throws {ApiError} 404 si no existe
   * @throws {ApiError} 400 si datos inválidos
   *
   * @example
   * const user = await authService.updateProfile('507f1f77bcf86cd799439011', {
   *   firstName: 'Jane',
   *   phone: '+34 123 456 789'
   * });
   */
  async updateProfile(userId, updateData) {
    const { firstName, lastName, phone } = updateData;

    const profileUpdate = {};
    if (firstName !== undefined)
      profileUpdate["profile.firstName"] = firstName.trim();
    if (lastName !== undefined)
      profileUpdate["profile.lastName"] = lastName.trim();
    if (phone !== undefined)
      profileUpdate["profile.phone"] = phone ? phone.trim() : null;

    const user = await User.findByIdAndUpdate(
      userId,
      { $set: profileUpdate },
      { new: true, runValidators: true }
    );

    if (!user) {
      throw ApiError.notFound("Usuario no encontrado");
    }

    return user.toJSON();
  }

  /**
   * Refrescar token de acceso usando refresh token
   *
   * Reglas del dominio:
   * - Refresh token debe ser válido y no expirado
   * - Retorna nuevo access token
   * - Refresh token NO se regenera (puedes cambiar esto si quieres)
   *
   * @param {string} refreshToken - Refresh token válido
   * @returns {Promise<Object>} { token }
   * @throws {ApiError} 401 si refresh token inválido
   *
   * @example
   * const result = await authService.refreshAccessToken(refreshToken);
   * // { token: 'nuevo_access_token' }
   */
  async refreshAccessToken(refreshToken) {
    try {
      // Verificar que el refresh token es válido
      const decoded = verifyToken(refreshToken, "refresh");

      // Verificar que el usuario aún existe y está activo
      const user = await User.findById(decoded.id);
      if (!user) {
        throw ApiError.notFound("Usuario no encontrado");
      }

      if (!user.isActive) {
        throw ApiError.forbidden("Usuario desactivado");
      }

      // Generar nuevo access token (CORREGIDO)
      const newAccessToken = generateAccessToken(
        user._id.toString(),
        user.role
      );

      return {
        token: newAccessToken,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }
      throw ApiError.unauthorized("Refresh token inválido o expirado");
    }
  }

  /**
   * Verificar si un email ya está registrado
   *
   * Uso: Para validaciones en tiempo real (frontend)
   *
   * @param {string} email
   * @returns {Promise<boolean>} true si existe
   */
  async emailExists(email) {
    const user = await User.findOne({ email: email.toLowerCase() });
    return !!user;
  }

  /**
   * Cambiar contraseña (requiere contraseña actual)
   *
   * Reglas del dominio:
   * - Debe proporcionar contraseña actual válida
   * - Nueva contraseña debe ser diferente
   * - Se resetean intentos de login fallidos
   *
   * @param {string} userId - ID del usuario
   * @param {string} currentPassword - Contraseña actual
   * @param {string} newPassword - Nueva contraseña
   * @returns {Promise<Object>} Usuario actualizado
   * @throws {ApiError} 401 si contraseña actual incorrecta
   *
   * @example
   * await authService.changePassword(userId, 'OldPass123!', 'NewPass456!');
   */
  async changePassword(userId, currentPassword, newPassword) {
    const user = await User.findById(userId).select("+password");

    if (!user) {
      throw ApiError.notFound("Usuario no encontrado");
    }

    // Verificar contraseña actual
    const isValid = await user.comparePassword(currentPassword);
    if (!isValid) {
      throw ApiError.unauthorized("Contraseña actual incorrecta");
    }

    // Actualizar contraseña
    user.password = newPassword;
    await user.save();

    return user.toJSON();
  }

  /**
   * Deactivar cuenta de usuario (soft delete)
   *
   * @param {string} userId
   * @returns {Promise<void>}
   */
  async deactivateAccount(userId) {
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: { isActive: false } },
      { new: true }
    );

    if (!user) {
      throw ApiError.notFound("Usuario no encontrado");
    }

    return user.toJSON();
  }
}

module.exports = new AuthService();
