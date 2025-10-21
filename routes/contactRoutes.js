const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// POST /api/contact/send - Enviar mensaje de contacto
router.post('/send', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud de contacto:', req.body);

    const { name, email, phone, subject, message } = req.body;

    // Validaciones básicas
    if (!name || !email || !subject || !message) {
      return res.status(400).json({
        success: false,
        message: 'Nombre, email, asunto y mensaje son obligatorios'
      });
    }

    const contactData = {
      name: name.trim(),
      email: email.trim(),
      phone: phone ? phone.trim() : 'No proporcionado',
      subject: subject.trim(),
      message: message.trim(),
      timestamp: new Date().toISOString()
    };

    console.log('📤 Enviando email...');
    const result = await emailService.sendContactEmail(contactData);

    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente. Te contactaremos pronto.',
      data: result
    });

  } catch (error) {
    console.error('❌ Error en contacto:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// GET /api/contact/test - Ruta de prueba mejorada
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Probando servicio de email...');
    
    const testData = {
      name: 'Usuario de Prueba',
      email: 'poloj3614@gmail.com',
      phone: '+57 300 000 0000',
      subject: 'Prueba del Sistema - ' + new Date().toISOString(),
      message: 'Esta es una prueba del sistema de correos de KillaVibes.',
      timestamp: new Date().toISOString()
    };

    const result = await emailService.sendContactEmail(testData);

    res.json({
      success: true,
      message: 'Email de prueba enviado exitosamente',
      data: result
    });
  } catch (error) {
    console.error('❌ Error en prueba:', error);
    res.status(500).json({
      success: false,
      message: 'Error en prueba: ' + error.message,
      config: {
        smtpHost: process.env.SMTP_HOST,
        smtpPort: process.env.SMTP_PORT,
        smtpUser: process.env.SMTP_USER ? 'Configurado' : 'No configurado'
      }
    });
  }
});

// GET /api/contact/config - Ver configuración (sin credenciales)
router.get('/config', (req, res) => {
  res.json({
    smtpHost: process.env.SMTP_HOST,
    smtpPort: process.env.SMTP_PORT,
    smtpUser: process.env.SMTP_USER ? 'Configurado' : 'No configurado',
    smtpFrom: process.env.SMTP_FROM
  });
});

module.exports = router;