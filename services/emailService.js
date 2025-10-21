const nodemailer = require("nodemailer");

class EmailService {
  constructor() {
    // Configuración más robusta para Gmail
    this.transporter = nodemailer.createTransport({
      service: "gmail", // Usar servicio en lugar de host/port
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      // Configuraciones para evitar timeout
      connectionTimeout: 30000,
      greetingTimeout: 30000,
      socketTimeout: 30000,
      // Logs para debugging
      logger: true,
      debug: true,
    });
  }

  async sendContactEmail(contactData) {
    try {
      const { name, email, phone, subject, message } = contactData;

      console.log("🔧 Iniciando envío de email...");
      console.log("📧 Desde:", process.env.SMTP_USER);
      console.log("📨 Para admin: poloj3614@gmail.com");

      // Email simple para el administrador
      const mailOptions = {
        from: `"KillaVibes Contacto" <${process.env.SMTP_USER}>`,
        to: "poloj3614@gmail.com", // Solo enviar al admin por ahora
        subject: `📧 Contacto: ${subject}`,
        html: this.getEmailTemplate(contactData),
        text: this.getTextTemplate(contactData),
      };

      console.log("📤 Enviando email...");
      const result = await this.transporter.sendMail(mailOptions);
      console.log("✅ Email enviado exitosamente:", result.messageId);

      return {
        success: true,
        message: "Email enviado exitosamente",
        messageId: result.messageId,
      };
    } catch (error) {
      console.error("❌ Error detallado en EmailService:");
      console.error("🔧 Código:", error.code);
      console.error("📝 Mensaje:", error.message);

      let errorMessage = "Error al enviar el email: ";

      if (error.code === "EAUTH") {
        errorMessage +=
          "Error de autenticación con Gmail. Verifica las credenciales.";
      } else if (error.code === "ECONNECTION" || error.code === "ETIMEDOUT") {
        errorMessage +=
          "No se pudo conectar a Gmail. El servicio puede estar bloqueado.";
      } else {
        errorMessage += error.message;
      }

      throw new Error(errorMessage);
    }
  }

  getEmailTemplate(contactData) {
    const { name, email, phone, subject, message } = contactData;

    return `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">🛍️ KillaVibes - Nuevo Mensaje</h2>
        <div style="background: #f9f9f9; padding: 20px; border-radius: 8px;">
          <p><strong>👤 Nombre:</strong> ${name}</p>
          <p><strong>📧 Email:</strong> ${email}</p>
          <p><strong>📞 Teléfono:</strong> ${phone || "No proporcionado"}</p>
          <p><strong>🎯 Asunto:</strong> ${subject}</p>
          <p><strong>💬 Mensaje:</strong></p>
          <div style="background: white; padding: 15px; border-radius: 5px; margin-top: 10px;">
            ${message.replace(/\n/g, "<br>")}
          </div>
        </div>
        <p style="color: #666; font-size: 12px; margin-top: 20px;">
          Enviado desde el formulario de contacto de KillaVibes<br>
          ${new Date().toLocaleString("es-CO")}
        </p>
      </div>
    `;
  }

  getTextTemplate(contactData) {
    const { name, email, phone, subject, message } = contactData;

    return `
KILLAVIBES - NUEVO MENSAJE

Nombre: ${name}
Email: ${email}
Teléfono: ${phone || "No proporcionado"}
Asunto: ${subject}

Mensaje:
${message}

---
Enviado desde formulario de contacto
${new Date().toLocaleString("es-CO")}
    `;
  }
}

module.exports = new EmailService();
