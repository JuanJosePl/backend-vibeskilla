// src/modules/contact/contact.controller.js

const contactService = require('./contact.service');
const catchAsync = require('../../core/utils/catchAsync');

/**
 * @class ContactController
 * @description Controlador ultra delgado para formularios de contacto
 * 
 * Responsabilidades:
 * - Recibir mensajes de contacto
 * - Delegar procesamiento al service
 * - Formatear respuestas HTTP
 * 
 * Patrones aplicados:
 * - MVC Pattern (Controller)
 * - Thin Controller Pattern
 * - Delegation Pattern
 */

/**
 * @desc    Enviar mensaje de contacto
 * @route   POST /api/contact
 * @access  Public
 */
const sendContactMessage = catchAsync(async (req, res) => {
  const result = await contactService.sendContactMessage(req.body);
  
  res.status(200).json({
    success: true,
    message: result.message,
    data: result.contactId ? { id: result.contactId } : undefined
  });
});

/**
 * @desc    Obtener mensajes de contacto (Admin)
 * @route   GET /api/contact/admin/messages
 * @access  Private/Admin
 */
const getContactMessages = catchAsync(async (req, res) => {
  const result = await contactService.getContactMessages(req.query);
  
  res.json({
    success: true,
    data: result.messages,
    pagination: result.pagination
  });
});

/**
 * @desc    Marcar mensaje como leído (Admin)
 * @route   PUT /api/contact/admin/messages/:id/read
 * @access  Private/Admin
 */
const markAsRead = catchAsync(async (req, res) => {
  await contactService.markAsRead(req.params.id);
  
  res.json({
    success: true,
    message: 'Mensaje marcado como leído'
  });
});

/**
 * @desc    Responder mensaje de contacto (Admin)
 * @route   POST /api/contact/admin/messages/:id/reply
 * @access  Private/Admin
 */
const replyToMessage = catchAsync(async (req, res) => {
  await contactService.replyToMessage(req.params.id, req.body.reply);
  
  res.json({
    success: true,
    message: 'Respuesta enviada exitosamente'
  });
});

/**
 * @desc    Eliminar mensaje de contacto (Admin)
 * @route   DELETE /api/contact/admin/messages/:id
 * @access  Private/Admin
 */
const deleteContactMessage = catchAsync(async (req, res) => {
  await contactService.deleteContactMessage(req.params.id);
  
  res.json({
    success: true,
    message: 'Mensaje eliminado exitosamente'
  });
});

module.exports = {
  sendContactMessage,
  getContactMessages,
  markAsRead,
  replyToMessage,
  deleteContactMessage
};