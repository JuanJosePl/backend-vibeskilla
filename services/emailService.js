const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Agregar configuraciones para evitar timeout
      connectionTimeout: 10000, // 10 segundos
      greetingTimeout: 10000,
      socketTimeout: 10000,
      // Intentar reconexión
      retries: 3,
      // Logs detallados
      logger: true,
      debug: true,
    });
  }

  async sendContactEmail(contactData) {
    try {
      const { name, email, phone, subject, message } = contactData;

      console.log("🔧 Configurando transporte de email...");
      console.log("📧 Usuario SMTP:", process.env.SMTP_USER);
      console.log("🏠 Host SMTP:", process.env.SMTP_HOST);
      console.log("🚪 Puerto SMTP:", process.env.SMTP_PORT);

      // Verificar la conexión primero
      console.log("🔍 Verificando conexión SMTP...");
      await this.transporter.verify();
      console.log("✅ Conexión SMTP verificada");

      // Email para el administrador
      const adminMailOptions = {
        from: `"KillaVibes Contacto" <${process.env.SMTP_USER}>`,
        to: "poloj3614@gmail.com",
        subject: `📧 Nuevo mensaje: ${subject}`,
        html: this.getSimpleEmailTemplate(contactData, "admin"),
        // Texto plano como fallback
        text: this.getTextTemplate(contactData, "admin"),
      };

      console.log("📤 Enviando email al admin...");
      const adminResult = await this.transporter.sendMail(adminMailOptions);
      console.log("✅ Email para admin enviado:", adminResult.messageId);

      return {
        success: true,
        message: "Email enviado exitosamente",
        messageId: adminResult.messageId,
      };
    } catch (error) {
      console.error("❌ Error detallado en EmailService:");
      console.error("🔧 Tipo de error:", error.code);
      console.error("📝 Mensaje:", error.message);
      console.error("🔍 Stack:", error.stack);

      // Mensajes de error más específicos
      let errorMessage = "Error al enviar el email: ";

      if (error.code === "EAUTH") {
        errorMessage +=
          "Error de autenticación. Verifica usuario y contraseña.";
      } else if (error.code === "ECONNECTION") {
        errorMessage += "No se pudo conectar al servidor SMTP.";
      } else if (error.code === "ETIMEDOUT") {
        errorMessage += "Timeout de conexión. Verifica la configuración SMTP.";
      } else {
        errorMessage += error.message;
      }

      throw new Error(errorMessage);
    }
  }

  getSimpleEmailTemplate(contactData, type) {
    const { name, email, phone, subject, message } = contactData;

    if (type === "admin") {
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">🛍️ KillaVibes - Nuevo Mensaje de Contacto</h2>
          <div style="background: #f5f5f5; padding: 15px; border-radius: 5px;">
            <p><strong>Nombre:</strong> ${name}</p>
            <p><strong>Email:</strong> ${email}</p>
            <p><strong>Teléfono:</strong> ${phone || "No proporcionado"}</p>
            <p><strong>Asunto:</strong> ${subject}</p>
            <p><strong>Mensaje:</strong></p>
            <div style="background: white; padding: 10px; border-radius: 3px;">
              ${message.replace(/\n/g, "<br>")}
            </div>
          </div>
          <p style="color: #666; font-size: 12px; margin-top: 20px;">
            Enviado desde el formulario de contacto de KillaVibes - ${new Date().toLocaleString(
              "es-CO"
            )}
          </p>
        </div>
      `;
    }
  }

  getTextTemplate(contactData, type) {
    const { name, email, phone, subject, message } = contactData;

    if (type === "admin") {
      return `
KILLAVIBES - NUEVO MENSAJE DE CONTACTO

Nombre: ${name}
Email: ${email}
Teléfono: ${phone || "No proporcionado"}
Asunto: ${subject}

Mensaje:
${message}

---
Enviado desde el formulario de contacto de KillaVibes
${new Date().toLocaleString("es-CO")}
      `;
    }
  }
}

module.exports = new EmailService();
