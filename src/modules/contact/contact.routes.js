// src/modules/contact/contact.routes.js

const express = require('express');
const router = express.Router();
const contactController = require('./contact.controller');
const { validate, contactValidation } = require('./contact.validation');
const { authMiddleware, requireRole } = require('../../middleware/auth');

/**
 * @description Rutas del módulo CONTACT
 * 
 * Estructura:
 * - POST / - Envío de mensaje (público)
 * - GET /admin/messages - Listado (admin)
 * - PUT /admin/messages/:id/read - Marcar leído (admin)
 * - POST /admin/messages/:id/reply - Responder (admin)
 * - DELETE /admin/messages/:id - Eliminar (admin)
 */

// ============================================
// RUTAS PÚBLICAS
// ============================================

/**
 * POST /api/contact
 * Enviar mensaje de contacto
 * No requiere autenticación
 */
router.post(
  '/',
  validate(contactValidation.sendMessage),
  contactController.sendContactMessage
);

// ============================================
// RUTAS ADMINISTRATIVAS
// ============================================

// Middleware: requiere admin/moderator
router.use('/admin', authMiddleware, requireRole('admin', 'moderator'));

/**
 * GET /api/contact/admin/messages
 * Obtener mensajes de contacto con filtros y paginación
 */
router.get(
  '/admin/messages',
  validate(contactValidation.getMessages),
  contactController.getContactMessages
);

/**
 * PUT /api/contact/admin/messages/:id/read
 * Marcar mensaje como leído
 */
router.put(
  '/admin/messages/:id/read',
  validate(contactValidation.messageId),
  contactController.markAsRead
);

/**
 * POST /api/contact/admin/messages/:id/reply
 * Responder mensaje de contacto
 */
router.post(
  '/admin/messages/:id/reply',
  validate(contactValidation.replyMessage),
  contactController.replyToMessage
);

/**
 * DELETE /api/contact/admin/messages/:id
 * Eliminar mensaje de contacto
 */
router.delete(
  '/admin/messages/:id',
  validate(contactValidation.messageId),
  contactController.deleteContactMessage
);

module.exports = router;