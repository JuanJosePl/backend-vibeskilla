const sgMail = require("@sendgrid/mail");

/**
 * @class EmailService
 * @description Servicio global para envío de emails
 *
 * Usa SendGrid como proveedor de email
 * Este es un servicio GLOBAL, no un módulo
 */
class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log("✅ SendGrid configurado correctamente");
    } else {
      console.warn(
        "⚠️  SENDGRID_API_KEY no configurada - Emails deshabilitados"
      );
      this.isConfigured = false;
      return;
    }
    this.isConfigured = true;
    this.fromEmail =
      process.env.SENDGRID_FROM_EMAIL || "poloj3614@gmail.com";
    this.supportEmail = process.env.SUPPORT_EMAIL || "poloj3614@gmail.com";
  }

  /**
   * ✅ MEJORADO: Enviar email de contacto (a admins)
   * @deprecated Usar sendContactNotification() en su lugar
   *
   * @param {Object} contactData - Datos del formulario de contacto
   * @returns {Promise<Object>}
   */
  async sendContactEmail(contactData) {
    console.warn(
      "⚠️ sendContactEmail() está deprecated. Usa sendContactNotification()"
    );
    return this.sendContactNotification(contactData);
  }

  /**
   * ✅ NUEVO: Enviar notificación de contacto a admins
   *
   * @param {Object} contactData - Datos del formulario de contacto
   * @returns {Promise<Object>}
   */
  async sendContactNotification(contactData) {
    if (!this.isConfigured) {
      console.warn("⚠️  Intento de enviar email sin configurar SendGrid");
      return { success: false, message: "Email no configurado" };
    }

    try {
      const { name, email, phone, subject, message, contactId } = contactData;

      console.log("📤 Enviando notificación de contacto a admins...");
      console.log("📨 De:", email);
      console.log("📧 Para:", this.supportEmail);

      const msg = {
        to: this.supportEmail,
        from: {
          email: this.fromEmail,
          name: "KillaVibes Contacto",
        },
        replyTo: email, // Para responder directamente al cliente
        subject: `📧 ${subject}`,
        html: this._getContactEmailTemplate({
          name,
          email,
          phone,
          subject,
          message,
          contactId,
        }),
        text: this._getContactTextTemplate({
          name,
          email,
          phone,
          subject,
          message,
        }),
      };

      const response = await sgMail.send(msg);

      console.log("✅ Email enviado exitosamente");
      console.log("📧 Status:", response[0].statusCode);

      return {
        success: true,
        message: "Email enviado exitosamente",
        statusCode: response[0].statusCode,
      };
    } catch (error) {
      console.error("❌ Error al enviar email:", error.message);

      if (error.response) {
        console.error("📝 Response:", error.response.body);
      }

      throw new Error(`Error al enviar email: ${error.message}`);
    }
  }

  /**
   * ✅ NUEVO: Enviar respuesta a mensaje de contacto
   *
   * @param {Object} replyData - Datos de la respuesta
   * @returns {Promise<Object>}
   */
  async sendContactReply(replyData) {
    if (!this.isConfigured) {
      console.warn("⚠️  Intento de enviar email sin configurar SendGrid");
      return { success: false, message: "Email no configurado" };
    }

    try {
      const { to, name, originalSubject, reply } = replyData;

      console.log("📤 Enviando respuesta a cliente...");
      console.log("📧 Para:", to);

      const msg = {
        to: to,
        from: {
          email: this.fromEmail,
          name: "KillaVibes Soporte",
        },
        subject: `Re: ${originalSubject}`,
        html: this._getContactReplyTemplate({ name, originalSubject, reply }),
        text: `Hola ${name},\n\nGracias por contactarnos.\n\n${reply}\n\nSaludos,\nEl equipo de KillaVibes`,
      };

      const response = await sgMail.send(msg);

      console.log("✅ Respuesta enviada exitosamente");

      return {
        success: true,
        message: "Respuesta enviada exitosamente",
        statusCode: response[0].statusCode,
      };
    } catch (error) {
      console.error("❌ Error al enviar respuesta:", error.message);

      if (error.response) {
        console.error("📝 Response:", error.response.body);
      }

      throw new Error(`Error al enviar respuesta: ${error.message}`);
    }
  }

  /**
   * Enviar email de bienvenida
   *
   * @param {Object} user - Usuario registrado
   * @returns {Promise<Object>}
   */
  async sendWelcomeEmail(user) {
    if (!this.isConfigured) return { success: false };

    try {
      const msg = {
        to: user.email,
        from: {
          email: this.fromEmail,
          name: "KillaVibes",
        },
        subject: "🎉 ¡Bienvenido a KillaVibes!",
        html: this._getWelcomeEmailTemplate(user),
        text: `¡Hola ${user.profile.firstName}! Bienvenido a KillaVibes.`,
      };

      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error("Error enviando email de bienvenida:", error.message);
      return { success: false };
    }
  }

  /**
   * Enviar confirmación de orden
   *
   * @param {Object} order - Orden creada
   * @returns {Promise<Object>}
   */
  async sendOrderConfirmation(order) {
    if (!this.isConfigured) return { success: false };

    try {
      const msg = {
        to: order.customerInfo.email,
        from: {
          email: this.fromEmail,
          name: "KillaVibes",
        },
        subject: `✅ Orden Confirmada #${order._id}`,
        html: this._getOrderConfirmationTemplate(order),
        text: `Tu orden #${order._id} ha sido confirmada.`,
      };

      await sgMail.send(msg);
      return { success: true };
    } catch (error) {
      console.error("Error enviando confirmación de orden:", error.message);
      return { success: false };
    }
  }

  // ==================== TEMPLATES ====================

  /**
   * Template para email de contacto (a admins)
   * @private
   */
  _getContactEmailTemplate(contactData) {
    const { name, email, phone, subject, message, contactId } = contactData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
          }
          .content { 
            padding: 30px; 
          }
          .field { 
            margin-bottom: 20px; 
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            border-left: 4px solid #667eea;
          }
          .label { 
            font-weight: bold; 
            color: #667eea; 
            display: block;
            margin-bottom: 5px;
          }
          .message-content {
            background: white;
            padding: 15px;
            border-radius: 5px;
            border: 1px solid #e9ecef;
            margin-top: 10px;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            font-size: 14px;
            color: #6c757d;
          }
          .urgent { 
            background: #fff3cd; 
            border-left-color: #ffc107; 
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ KillaVibes</h1>
            <p>Nuevo Mensaje de Contacto</p>
          </div>
          <div class="content">
            <div class="urgent">
              <strong>📬 Nuevo mensaje recibido</strong>
              <p>Un cliente se ha contactado a través del formulario web.</p>
              ${contactId ? `<p><strong>ID:</strong> ${contactId}</p>` : ""}
            </div>
            
            <div class="field">
              <span class="label">👤 Nombre:</span>
              ${name}
            </div>
            
            <div class="field">
              <span class="label">📧 Email:</span>
              <a href="mailto:${email}">${email}</a>
            </div>
            
            <div class="field">
              <span class="label">📞 Teléfono:</span>
              ${phone || "No proporcionado"}
            </div>
            
            <div class="field">
              <span class="label">🎯 Asunto:</span>
              ${subject}
            </div>
            
            <div class="field">
              <span class="label">💬 Mensaje:</span>
              <div class="message-content">
                ${message.replace(/\n/g, "<br>")}
              </div>
            </div>
            
            <div class="field">
              <span class="label">🕐 Fecha:</span>
              ${new Date().toLocaleString("es-CO", {
                year: "numeric",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
          <div class="footer">
            <p>📩 Enviado desde el formulario de contacto de KillaVibes</p>
            <p>📍 Barranquilla, Atlántico - Colombia</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * ✅ NUEVO: Template para respuesta a cliente
   * @private
   */
  _getContactReplyTemplate(replyData) {
    const { name, originalSubject, reply } = replyData;

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { 
            font-family: 'Arial', sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 0; 
            background-color: #f4f4f4;
          }
          .container { 
            max-width: 600px; 
            margin: 20px auto; 
            background: white; 
            border-radius: 10px; 
            overflow: hidden;
            box-shadow: 0 0 20px rgba(0,0,0,0.1);
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
            color: white; 
            padding: 30px 20px; 
            text-align: center; 
          }
          .header h1 { 
            margin: 0; 
            font-size: 24px; 
          }
          .content { 
            padding: 30px; 
          }
          .reply-box {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #667eea;
            margin: 20px 0;
          }
          .footer { 
            text-align: center; 
            margin-top: 30px; 
            padding: 20px; 
            background: #f8f9fa; 
            border-radius: 5px; 
            font-size: 14px;
            color: #6c757d;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ KillaVibes</h1>
            <p>Respuesta a tu Consulta</p>
          </div>
          <div class="content">
            <h2>Hola ${name},</h2>
            <p>Gracias por contactarnos. Hemos recibido tu mensaje sobre:</p>
            <p><strong>"${originalSubject}"</strong></p>
            
            <div class="reply-box">
              <h3>Nuestra Respuesta:</h3>
              ${reply.replace(/\n/g, "<br>")}
            </div>
            
            <p>Si tienes alguna otra pregunta, no dudes en responder este correo.</p>
            <p><strong>El equipo de KillaVibes</strong></p>
          </div>
          <div class="footer">
            <p>📧 ${process.env.SENDGRID_FROM_EMAIL || "noreply@killavibes.com"}</p>
            <p>📍 Barranquilla, Atlántico - Colombia</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template de texto para email de contacto
   * @private
   */
  _getContactTextTemplate(contactData) {
    const { name, email, phone, subject, message } = contactData;

    return `
KILLAVIBES - NUEVO MENSAJE DE CONTACTO

📬 INFORMACIÓN DEL CLIENTE:
Nombre: ${name}
Email: ${email}
Teléfono: ${phone || "No proporcionado"}
Asunto: ${subject}

💬 MENSAJE:
${message}

🕐 FECHA: ${new Date().toLocaleString("es-CO")}
📍 Barranquilla, Atlántico - Colombia

---
Enviado desde el formulario de contacto de KillaVibes
    `;
  }

  /**
   * Template para email de bienvenida
   * @private
   */
  _getWelcomeEmailTemplate(user) {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: white; padding: 30px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 ¡Bienvenido a KillaVibes!</h1>
          </div>
          <div class="content">
            <h2>Hola ${user.profile.firstName},</h2>
            <p>Estamos emocionados de tenerte como parte de nuestra comunidad.</p>
            <p>Ahora puedes disfrutar de:</p>
            <ul>
              <li>✨ Productos exclusivos</li>
              <li>🚚 Envíos a toda Colombia</li>
              <li>💳 Métodos de pago seguros</li>
              <li>🎁 Ofertas especiales</li>
            </ul>
            <a href="${process.env.FRONTEND_URL || "https://killavibes.com"}/products" class="button">Ver Productos</a>
            <p>¡Gracias por elegirnos!</p>
            <p><strong>El equipo de KillaVibes</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Template para confirmación de orden
   * @private
   */
  _getOrderConfirmationTemplate(order) {
    const itemsHtml = order.items
      .map(
        (item) => `
          <tr>
            <td>${item.productName}</td>
            <td>${item.quantity}</td>
            <td>$${item.unitPrice.toLocaleString("es-CO")}</td>
          </tr>
        `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; }
          .header { background: #667eea; color: white; padding: 20px; text-align: center; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { padding: 10px; text-align: left; border-bottom: 1px solid #ddd; }
          .total { font-weight: bold; font-size: 18px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Orden Confirmada</h1>
            <p>Orden #${order._id}</p>
          </div>
          <div style="padding: 20px;">
            <p>Hola ${order.customerInfo.firstName},</p>
            <p>Tu orden ha sido confirmada y está siendo procesada.</p>
            
            <h3>Resumen de la orden:</h3>
            <table>
              <thead>
                <tr>
                  <th>Producto</th>
                  <th>Cantidad</th>
                  <th>Precio</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            
            <p class="total">Total: $${order.totalAmount.toLocaleString("es-CO")}</p>
            
            <p>Te notificaremos cuando tu orden sea enviada.</p>
            <p>¡Gracias por tu compra!</p>
            <p><strong>KillaVibes</strong></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
  // AGREGAR AL FINAL DE email.service.js:

  /**
   * Enviar confirmación de orden
   */
  async sendOrderConfirmation(data) {
    const { to, name, orderNumber, totalAmount, items } = data;

    const itemsList = items
      .map(
        (item) =>
          `<li>${item.productName} x${item.quantity} - $${item.unitPrice}</li>`
      )
      .join("");

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>¡Orden confirmada!</h2>
      <p>Hola ${name},</p>
      <p>Tu orden <strong>${orderNumber}</strong> ha sido confirmada exitosamente.</p>
      
      <h3>Resumen de tu orden:</h3>
      <ul>${itemsList}</ul>
      
      <p><strong>Total: $${totalAmount}</strong></p>
      
      <p>Te notificaremos cuando tu orden sea enviada.</p>
      <p>Gracias por tu compra en VibesKilla.</p>
    </div>
  `;

    return this.send(to, `Orden confirmada - ${orderNumber}`, html);
  }

  /**
   * Enviar notificación de cancelación
   */
  async sendOrderCancellation(data) {
    const { to, name, orderNumber } = data;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Orden cancelada</h2>
      <p>Hola ${name},</p>
      <p>Tu orden <strong>${orderNumber}</strong> ha sido cancelada exitosamente.</p>
      <p>Si tienes alguna pregunta, no dudes en contactarnos.</p>
      <p>Saludos,<br>Equipo VibesKilla</p>
    </div>
  `;

    return this.send(to, `Orden cancelada - ${orderNumber}`, html);
  }

  /**
   * Enviar actualización de estado de orden
   */
  async sendOrderStatusUpdate(data) {
    const { to, name, orderNumber, status, trackingNumber } = data;

    let statusMessage = "";
    if (status === "shipped") {
      statusMessage = `Tu orden ha sido enviada. Número de tracking: <strong>${trackingNumber}</strong>`;
    } else if (status === "delivered") {
      statusMessage = "Tu orden ha sido entregada exitosamente.";
    }

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Actualización de tu orden</h2>
      <p>Hola ${name},</p>
      <p>${statusMessage}</p>
      <p>Orden: <strong>${orderNumber}</strong></p>
      <p>Gracias por tu compra en VibesKilla.</p>
    </div>
  `;

    return this.send(to, `Actualización de orden - ${orderNumber}`, html);
  }

  /**
   * Enviar solicitud de devolución (notifica a admins)
   */
  async sendReturnRequest(data) {
    const { orderNumber, customerEmail, reason } = data;

    const adminEmail = process.env.ADMIN_EMAIL || process.env.FROM_EMAIL;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Nueva solicitud de devolución</h2>
      <p><strong>Orden:</strong> ${orderNumber}</p>
      <p><strong>Cliente:</strong> ${customerEmail}</p>
      <p><strong>Razón:</strong> ${reason}</p>
      <p>Por favor, procesa esta solicitud lo antes posible.</p>
    </div>
  `;

    return this.send(
      adminEmail,
      `Solicitud de devolución - ${orderNumber}`,
      html
    );
  }

  /**
   * Enviar confirmación de reembolso
   */
  async sendRefundConfirmation(data) {
    const { to, name, orderNumber, refundAmount } = data;

    const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reembolso procesado</h2>
      <p>Hola ${name},</p>
      <p>Se ha procesado un reembolso de <strong>$${refundAmount}</strong> para tu orden <strong>${orderNumber}</strong>.</p>
      <p>El dinero será devuelto a tu método de pago original en 5-10 días hábiles.</p>
      <p>Saludos,<br>Equipo VibesKilla</p>
    </div>
  `;

    return this.send(to, `Reembolso procesado - ${orderNumber}`, html);
  }
}

module.exports = new EmailService();
