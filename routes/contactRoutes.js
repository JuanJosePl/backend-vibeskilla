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

    if (message.length < 10) {
      return res.status(400).json({
        success: false,
        message: 'El mensaje debe tener al menos 10 caracteres'
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

    console.log('📤 Enviando emails...');
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
      message: error.message || 'Error al enviar el mensaje. Por favor, intenta nuevamente.'
    });
  }
});

// GET /api/contact/test - Ruta de prueba
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Probando servicio de email...');
    
    const testData = {
      name: 'Usuario de Prueba',
      email: 'poloj3614@gmail.com', // Te llegará a tu email
      phone: '+57 300 000 0000',
      subject: 'Mensaje de prueba del sistema',
      message: 'Este es un mensaje de prueba para verificar que el sistema de correos está funcionando correctamente. Si recibes este email, todo está configurado perfectamente! 🎉',
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
      message: 'Error en prueba de email: ' + error.message
    });
  }
});

module.exports = router;