// src/modules/contact/contact.model.js

const mongoose = require('mongoose');

/**
 * @schema contactSchema
 * @description Esquema de mensajes de contacto
 * 
 * SOURCE OF TRUTH para el módulo contact
 * 
 * Responsabilidades:
 * - Almacenar mensajes de contacto
 * - Permitir gestión administrativa
 * - Protección anti-spam
 * - Auditoría de respuestas
 */
const contactSchema = new mongoose.Schema({
  // Información del remitente
  name: {
    type: String,
    required: [true, 'El nombre es requerido'],
    trim: true,
    minlength: [2, 'El nombre debe tener al menos 2 caracteres'],
    maxlength: [100, 'El nombre no puede tener más de 100 caracteres']
  },
  
  email: {
    type: String,
    required: [true, 'El email es requerido'],
    lowercase: true,
    trim: true,
    match: [
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
      'Email inválido'
    ]
  },
  
  phone: {
    type: String,
    trim: true,
    match: [
      /^[0-9\s\-\+$$$$]*$/,
      'Teléfono inválido'
    ]
  },
  
  // Contenido del mensaje
  subject: {
    type: String,
    required: [true, 'El asunto es requerido'],
    trim: true,
    minlength: [5, 'El asunto debe tener al menos 5 caracteres'],
    maxlength: [200, 'El asunto no puede tener más de 200 caracteres']
  },
  
  message: {
    type: String,
    required: [true, 'El mensaje es requerido'],
    trim: true,
    minlength: [10, 'El mensaje debe tener al menos 10 caracteres'],
    maxlength: [2000, 'El mensaje no puede tener más de 2000 caracteres']
  },
  
  // Estado del mensaje
  status: {
    type: String,
    enum: ['new', 'read', 'replied', 'archived'],
    default: 'new'
  },
  
  // Respuesta del administrador
  reply: {
    type: String,
    maxlength: [2000, 'La respuesta no puede tener más de 2000 caracteres']
  },
  
  // Auditoría
  readAt: Date,
  repliedAt: Date,
  
  // Metadata
  ipAddress: String,
  userAgent: String
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ÍNDICES
contactSchema.index({ email: 1, createdAt: -1 }); // Anti-spam
contactSchema.index({ status: 1, createdAt: -1 }); // Filtrado admin
contactSchema.index({ createdAt: -1 }); // Ordenamiento

/**
 * @virtual isNew
 * @description Verifica si el mensaje es nuevo (no leído)
 */
contactSchema.virtual('isNew').get(function() {
  return this.status === 'new';
});

/**
 * @method markAsRead
 * @description Marca el mensaje como leído
 * @returns {Promise<Contact>}
 */
contactSchema.methods.markAsRead = function() {
  this.status = 'read';
  this.readAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Contact', contactSchema);