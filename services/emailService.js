const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false, // IMPORTANTE: false para el puerto 587
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
    
    // Verificar la configuración al iniciar
    this.verifyTransporter();
  }

  async verifyTransporter() {
    try {
      await this.transporter.verify();
      console.log('✅ Servicio de email configurado correctamente');
    } catch (error) {
      console.error('❌ Error configurando email:', error);
    }
  }

  async sendContactEmail(contactData) {
    try {
      const { name, email, phone, subject, message } = contactData;

      console.log('📧 Enviando email desde:', process.env.SMTP_USER);

      // Email para el administrador (a tu Gmail)
      const adminMailOptions = {
        from: `"KillaVibes Contacto" <${process.env.SMTP_FROM}>`,
        to: 'poloj3614@gmail.com', // Tu email como admin
        subject: `📧 Nuevo mensaje: ${subject}`,
        html: this.getAdminEmailTemplate(contactData),
      };

      // Email de confirmación para el usuario que envió el formulario
      const userMailOptions = {
        from: `"KillaVibes" <${process.env.SMTP_FROM}>`,
        to: email, // Email del usuario que llenó el formulario
        subject: '✅ Confirmación de recepción - KillaVibes',
        html: this.getUserEmailTemplate(contactData),
      };

      // Enviar ambos emails
      const adminResult = await this.transporter.sendMail(adminMailOptions);
      console.log('✅ Email para admin enviado:', adminResult.messageId);

      const userResult = await this.transporter.sendMail(userMailOptions);
      console.log('✅ Email para usuario enviado:', userResult.messageId);

      return { 
        success: true, 
        message: 'Emails enviados exitosamente',
        adminMessageId: adminResult.messageId,
        userMessageId: userResult.messageId
      };

    } catch (error) {
      console.error('❌ Error en EmailService:', error);
      throw new Error('Error al enviar los emails: ' + error.message);
    }
  }

  getAdminEmailTemplate(contactData) {
    const { name, email, phone, subject, message, timestamp } = contactData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; }
          .field { margin-bottom: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #667eea; }
          .label { font-weight: bold; color: #667eea; display: block; margin-bottom: 5px; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ KillaVibes - Nuevo Mensaje</h1>
            <p>Formulario de Contacto</p>
          </div>
          <div class="content">
            <div class="field">
              <span class="label">👤 Nombre:</span> ${name}
            </div>
            <div class="field">
              <span class="label">📧 Email:</span> <a href="mailto:${email}">${email}</a>
            </div>
            <div class="field">
              <span class="label">📞 Teléfono:</span> ${phone || 'No proporcionado'}
            </div>
            <div class="field">
              <span class="label">🎯 Asunto:</span> ${subject}
            </div>
            <div class="field">
              <span class="label">💬 Mensaje:</span><br>
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          <div class="footer">
            <p>📩 Enviado desde el formulario de contacto de KillaVibes</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getUserEmailTemplate(contactData) {
    const { name, subject, message } = contactData;
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f4f4f4; }
          .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 0 20px rgba(0,0,0,0.1); }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px 20px; text-align: center; }
          .content { padding: 30px; }
          .footer { text-align: center; margin-top: 30px; padding: 20px; background: #f8f9fa; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🛍️ KillaVibes</h1>
            <p>¡Gracias por contactarnos!</p>
          </div>
          <div class="content">
            <h2>Hola ${name},</h2>
            <p>Hemos recibido tu mensaje y te agradecemos por contactar con <strong>KillaVibes</strong>.</p>
            
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h3>Resumen de tu mensaje:</h3>
              <p><strong>Asunto:</strong> ${subject}</p>
              <p><strong>Mensaje:</strong><br>${message.replace(/\n/g, '<br>')}</p>
            </div>
            
            <p>Nos pondremos en contacto contigo dentro de las próximas 24 horas hábiles.</p>
            
            <p><strong>¿Necesitas ayuda inmediata?</strong><br>
            Contáctanos por WhatsApp: <strong>+57 300 252 1314</strong></p>
          </div>
          <div class="footer">
            <p>© 2025 KillaVibes. Todos los derechos reservados.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}

module.exports = new EmailService();