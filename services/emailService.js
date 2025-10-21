const sgMail = require('@sendgrid/mail');

class EmailService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      console.log('✅ SendGrid configurado correctamente');
    } else {
      console.log('❌ ERROR: SENDGRID_API_KEY no encontrada');
      throw new Error('SendGrid no configurado');
    }
  }

  async sendContactEmail(contactData) {
    try {
      const { name, email, phone, subject, message } = contactData;

      console.log('🔄 Iniciando envío de email...');
      console.log('📨 Destino: poloj3614@gmail.com');
      console.log('👤 Remitente:', email);

      const msg = {
        to: 'poloj3614@gmail.com', // Tú recibes los mensajes
        from: {
          email: 'poloj3614@gmail.com',
          name: 'KillaVibes Contacto'
        },
        subject: `📧 ${subject}`,
        html: this.getEmailTemplate(contactData),
        text: this.getTextTemplate(contactData),
        replyTo: email // Para responder directo al cliente
      };

      console.log('📤 Enviando via SendGrid...');
      const response = await sgMail.send(msg);
      
      console.log('✅ Email enviado EXITOSAMENTE');
      console.log('🔧 Response status:', response[0].statusCode);
      
      return {
        success: true,
        message: 'Email enviado exitosamente',
        statusCode: response[0].statusCode
      };

    } catch (error) {
      console.error('❌ ERROR SendGrid:');
      console.error('🔧 Código:', error.code);
      console.error('📝 Mensaje:', error.message);
      
      if (error.response) {
        console.error('🔍 Response body:', error.response.body);
      }
      
      throw new Error(`Error al enviar email: ${error.message}`);
    }
  }

  getEmailTemplate(contactData) {
    const { name, email, phone, subject, message } = contactData;
    
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
              ${phone || 'No proporcionado'}
            </div>
            
            <div class="field">
              <span class="label">🎯 Asunto:</span>
              ${subject}
            </div>
            
            <div class="field">
              <span class="label">💬 Mensaje:</span>
              <div class="message-content">
                ${message.replace(/\n/g, '<br>')}
              </div>
            </div>
            
            <div class="field">
              <span class="label">🕐 Fecha:</span>
              ${new Date().toLocaleString('es-CO', { 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
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

  getTextTemplate(contactData) {
    const { name, email, phone, subject, message } = contactData;
    
    return `
KILLAVIBES - NUEVO MENSAJE DE CONTACTO

📬 INFORMACIÓN DEL CLIENTE:
Nombre: ${name}
Email: ${email}
Teléfono: ${phone || 'No proporcionado'}
Asunto: ${subject}

💬 MENSAJE:
${message}

🕐 FECHA: ${new Date().toLocaleString('es-CO')}
📍 Barranquilla, Atlántico - Colombia

---
Enviado desde el formulario de contacto de KillaVibes
    `;
  }
}

module.exports = new EmailService();