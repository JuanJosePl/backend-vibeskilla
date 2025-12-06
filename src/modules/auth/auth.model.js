const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ROLES } = require('../../core/constants/roles');

/**
 * @schema userSchema
 * @description Esquema de usuario con autenticación, seguridad y auditoría
 * 
 * SOURCE OF TRUTH para el módulo auth
 * 
 * Seguridad:
 * - Contraseña hasheada con bcrypt
 * - Intentos de login fallidos registrados
 * - Bloqueo temporal de cuenta después de X intentos
 * - Email único y normalizado
 * - Timestamps de auditoría
 * 
 * DDD (Domain Driven Design):
 * - Agregado User como entidad raíz
 * - Value Objects: email, profile
 * - Invariantes de negocio: email único, password hasheada
 */

const userSchema = new mongoose.Schema({
  // ========== CREDENCIALES DE AUTENTICACIÓN ==========
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Email inválido'
    ]
  },

  password: {
    type: String,
    required: [true, 'La contraseña es requerida'],
    minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    select: false // No incluir password en queries por defecto
  },

  // ========== INFORMACIÓN DEL PERFIL ==========
  profile: {
    firstName: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
      maxlength: [50, 'El nombre no puede exceder 50 caracteres']
    },

    lastName: {
      type: String,
      required: [true, 'El apellido es requerido'],
      trim: true,
      maxlength: [50, 'El apellido no puede exceder 50 caracteres']
    },

    phone: {
      type: String,
      trim: true,
      match: [/^[0-9\s\-\+$$$$]*$/, 'Teléfono inválido'],
      default: null
    },

    avatar: {
      type: String,
      default: null
    }
  },

  // ========== CONTROL DE ACCESO ==========
  role: {
    type: String,
    enum: Object.values(ROLES),
    default: ROLES.CUSTOMER
  },

  isActive: {
    type: Boolean,
    default: true
  },

  emailVerified: {
    type: Boolean,
    default: false
  },

  // ========== SEGURIDAD - PROTECCIÓN CONTRA FUERZA BRUTA ==========
  loginAttempts: {
    type: Number,
    default: 0,
    select: false
  },

  lockUntil: {
    type: Date,
    default: null,
    select: false
  },

  // ========== TOKENS (para recuperación de contraseña, etc) ==========
  resetPasswordToken: {
    type: String,
    select: false,
    default: null
  },

  resetPasswordExpire: {
    type: Date,
    select: false,
    default: null
  },

  // ========== METADATOS Y AUDITORÍA ==========
  lastLogin: {
    type: Date,
    default: null
  },

  lastLoginIp: {
    type: String,
    default: null
  },

  loginHistory: [
    {
      timestamp: {
        type: Date,
        default: Date.now
      },
      ip: String,
      userAgent: String,
      success: {
        type: Boolean,
        default: false
      }
    }
  ]
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ========== ÍNDICES PARA OPTIMIZACIÓN ==========
/**
 * Índices principales:
 * - email: Búsquedas rápidas por email (login, registro)
 * - role + isActive: Queries frecuentes de filtrado
 * - createdAt: Queries ordenadas por fecha
 * - lastLogin: Análisis de usuarios activos
 */
userSchema.index({ email: 1 });
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLogin: -1 });
userSchema.index({ resetPasswordExpire: 1 }, { sparse: true });

// ========== MIDDLEWARE PRE-SAVE ==========

/**
 * @middleware pre('save')
 * @description Encripta la contraseña antes de guardar
 * Solo se ejecuta si la contraseña fue modificada
 */
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

/**
 * @middleware pre('save')
 * @description Resetea intentos de login cuando contraseña es cambiada
 */
userSchema.pre('save', async function(next) {
  if (this.isModified('password')) {
    this.loginAttempts = 0;
    this.lockUntil = null;
  }
  next();
});

// ========== MÉTODOS DE INSTANCIA ==========

/**
 * @method comparePassword
 * @description Compara contraseña en texto plano con hash
 * 
 * @param {string} candidatePassword - Contraseña a verificar
 * @returns {Promise<boolean>}
 */
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

/**
 * @method isAccountLocked
 * @description Verifica si la cuenta está bloqueada por intentos fallidos
 * 
 * @returns {boolean}
 */
userSchema.methods.isAccountLocked = function() {
  // Si hay un lockUntil y aún no ha pasado
  return this.lockUntil && this.lockUntil > Date.now();
};

/**
 * @method incrementLoginAttempts
 * @description Incrementa intentos fallidos de login
 * Bloquea la cuenta después de 5 intentos por 15 minutos
 * 
 * @returns {Promise<void>}
 */
userSchema.methods.incrementLoginAttempts = async function() {
  const MAX_LOGIN_ATTEMPTS = 5;
  const LOCK_TIME_MINUTES = 15;

  // Si la cuenta estaba bloqueada y el tiempo ya pasó, resetear
  if (this.lockUntil && this.lockUntil < Date.now()) {
    return this.updateOne({
      $set: { loginAttempts: 1, lockUntil: null }
    });
  }

  // Incrementar intentos
  const updates = { $inc: { loginAttempts: 1 } };

  // Si se alcanzó el máximo, bloquear
  if (this.loginAttempts + 1 >= MAX_LOGIN_ATTEMPTS && !this.isAccountLocked()) {
    updates.$set = { lockUntil: new Date(Date.now() + LOCK_TIME_MINUTES * 60 * 1000) };
  }

  return this.updateOne(updates);
};

/**
 * @method resetLoginAttempts
 * @description Resetea intentos fallidos después de login exitoso
 * 
 * @returns {Promise<void>}
 */
userSchema.methods.resetLoginAttempts = async function() {
  return this.updateOne({
    $set: { loginAttempts: 0, lockUntil: null }
  });
};

/**
 * @static emailExists
 * @description Verifica si un email ya está registrado
 */
userSchema.statics.emailExists = async function(email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !!user;
};

/**
 * @method toJSON
 * @description Elimina campos sensibles de las respuestas JSON
 * Se aplica automáticamente con JSON.stringify(user)
 * 
 * @returns {Object} Usuario sin campos sensibles
 */
userSchema.methods.toJSON = function() {
  const user = this.toObject();
  delete user.password;
  delete user.__v;
  delete user.loginAttempts;
  delete user.lockUntil;
  delete user.resetPasswordToken;
  delete user.resetPasswordExpire;
  delete user.loginHistory;
  return user;
};

// ========== VIRTUALES ==========

/**
 * @virtual fullName
 * @description Retorna nombre completo del usuario
 */
userSchema.virtual('fullName').get(function() {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

/**
 * @virtual isLocked
 * @description Retorna si la cuenta está bloqueada
 */
userSchema.virtual('isLocked').get(function() {
  return this.isAccountLocked();
});

module.exports = mongoose.model('User', userSchema);