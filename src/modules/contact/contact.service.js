const Contact = require('./contact.model');
const emailService = require('../../services/email.service');
const ApiError = require('../../core/errors/ApiError');
const logger = require('../../core/utils/logger');

/**
 * @class ContactService
 * @description Lógica de negocio para formularios de contacto
 * 
 * Responsabilidades:
 * - Validar y procesar mensajes de contacto
 * - Protección anti-spam (rate limiting)
 * - Enviar notificaciones por email
 * - Gestionar histórico de mensajes
 * - CRUD para administradores
 */
class ContactService {
  
  /**
   * Enviar mensaje de contacto
   * 
   * @param {Object} contactData - Datos del formulario
   * @param {Object} metadata - IP y User Agent
   * @returns {Promise<Object>}
   */
  async sendContactMessage(contactData, metadata = {}) {
    try {
      const { name, email, phone, subject, message } = contactData;
      const { ipAddress, userAgent } = metadata;

      // ✅ Validación anti-spam: máximo 3 mensajes por email en 1 hora
      const oneHourAgo = new Date();
      oneHourAgo.setHours(oneHourAgo.getHours() - 1);
      
      const recentMessagesCount = await Contact.countDocuments({
        email: email.toLowerCase(),
        createdAt: { $gte: oneHourAgo }
      });

      if (recentMessagesCount >= 3) {
        logger.warn(`Anti-spam activado para email: ${email} (IP: ${ipAddress})`);
        throw ApiError.badRequest(
          'Has enviado demasiados mensajes. Intenta nuevamente en 1 hora.'
        );
      }

      // ✅ Guardar mensaje en base de datos con metadata
      const contact = await Contact.create({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        phone: phone?.trim(),
        subject: subject.trim(),
        message: message.trim(),
        status: 'new',
        ipAddress,
        userAgent
      });

      logger.info(`Nuevo mensaje de contacto recibido: ${contact._id} (${email})`);

      // ✅ Enviar notificación por email (no bloquear si falla)
      try {
        await emailService.sendContactNotification({
          name,
          email,
          phone,
          subject,
          message,
          contactId: contact._id
        });
        logger.info(`Email de notificación enviado para contacto ${contact._id}`);
      } catch (emailError) {
        logger.error('Error al enviar email de contacto:', emailError);
        // No fallar si el email falla, el mensaje ya está guardado
      }

      return {
        success: true,
        message: 'Mensaje enviado exitosamente. Te contactaremos pronto.',
        contactId: contact._id
      };
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error en sendContactMessage:', error);
      throw ApiError.internal('Error al procesar el mensaje de contacto');
    }
  }

  /**
   * Obtener mensajes de contacto con filtros (Admin)
   * 
   * @param {Object} options - Opciones de filtrado y paginación
   * @returns {Promise<Object>}
   */
  async getContactMessages(options = {}) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      // Construir query
      const query = {};
      
      if (status) query.status = status;
      
      if (search) {
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          { email: { $regex: search, $options: 'i' } },
          { subject: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;
      const sort = { [sortBy]: sortOrder === 'desc' ? -1 : 1 };

      const [messages, total] = await Promise.all([
        Contact.find(query)
          .sort(sort)
          .limit(parseInt(limit))
          .skip(skip)
          .lean(),
        Contact.countDocuments(query)
      ]);

      logger.info(`Admin consultó ${messages.length} mensajes de contacto`);

      return {
        messages,
        pagination: {
          current: parseInt(page),
          pages: Math.ceil(total / limit),
          total,
          limit: parseInt(limit)
        }
      };
      
    } catch (error) {
      logger.error('Error en getContactMessages:', error);
      throw ApiError.internal('Error al obtener mensajes de contacto');
    }
  }

  /**
   * Marcar mensaje como leído (Admin)
   * 
   * @param {string} contactId - ID del mensaje
   * @returns {Promise<void>}
   */
  async markAsRead(contactId) {
    try {
      const contact = await Contact.findByIdAndUpdate(
        contactId,
        { 
          status: 'read',
          readAt: new Date()
        },
        { new: true }
      );

      if (!contact) {
        throw ApiError.notFound('Mensaje de contacto no encontrado');
      }

      logger.info(`Mensaje ${contactId} marcado como leído`);
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error en markAsRead:', error);
      throw ApiError.internal('Error al marcar mensaje como leído');
    }
  }

  /**
   * Responder mensaje de contacto (Admin)
   * 
   * @param {string} contactId - ID del mensaje
   * @param {string} reply - Respuesta del administrador
   * @returns {Promise<void>}
   */
  async replyToMessage(contactId, reply) {
    try {
      const contact = await Contact.findById(contactId);

      if (!contact) {
        throw ApiError.notFound('Mensaje de contacto no encontrado');
      }

      // ✅ Enviar email de respuesta al usuario
      try {
        await emailService.sendContactReply({
          to: contact.email,
          name: contact.name,
          originalSubject: contact.subject,
          originalMessage: contact.message,
          reply
        });
        logger.info(`Respuesta enviada al contacto ${contactId} (${contact.email})`);
      } catch (emailError) {
        logger.error('Error al enviar respuesta por email:', emailError);
        throw ApiError.internal('Error al enviar la respuesta por email');
      }

      // ✅ Actualizar estado del mensaje
      await Contact.findByIdAndUpdate(contactId, {
        status: 'replied',
        repliedAt: new Date(),
        reply
      });

      logger.info(`Mensaje ${contactId} respondido exitosamente`);
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error en replyToMessage:', error);
      throw ApiError.internal('Error al responder mensaje');
    }
  }

  /**
   * Eliminar mensaje de contacto (Admin)
   * 
   * @param {string} contactId - ID del mensaje
   * @returns {Promise<void>}
   */
  async deleteContactMessage(contactId) {
    try {
      const contact = await Contact.findByIdAndDelete(contactId);

      if (!contact) {
        throw ApiError.notFound('Mensaje de contacto no encontrado');
      }

      logger.warn(`Mensaje ${contactId} eliminado por admin (email: ${contact.email})`);
      
    } catch (error) {
      if (error instanceof ApiError) throw error;
      logger.error('Error en deleteContactMessage:', error);
      throw ApiError.internal('Error al eliminar mensaje');
    }
  }
}

module.exports = new ContactService();