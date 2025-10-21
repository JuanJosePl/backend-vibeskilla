const express = require('express');
const router = express.Router();

// POST /api/contact/send - ENVÍO PRINCIPAL
router.post('/send', async (req, res) => {
  try {
    console.log('📨 SOLICITUD DE CONTACTO RECIBIDA');
    console.log('📝 Datos:', req.body);

    const { name, email, phone, subject, message } = req.body;

    // Validaciones rápidas
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

    console.log('🔄 Procesando solicitud...');
    
    // ENVIAR EMAIL CON SENDGRID
    const emailService = require('../services/emailService');
    const emailResult = await emailService.sendContactEmail(contactData);

    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    
    res.json({
      success: true,
      message: '¡Mensaje enviado exitosamente! Te contactaremos dentro de 24 horas.',
      data: emailResult
    });

  } catch (error) {
    console.error('❌ ERROR EN CONTACTO:', error.message);
    res.status(500).json({
      success: false,
      message: 'Error al enviar el mensaje: ' + error.message
    });
  }
});

// GET /api/contact/test - PRUEBA DEL SISTEMA
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 INICIANDO PRUEBA DEL SISTEMA...');
    
    const testData = {
      name: 'Juan José Prueba',
      email: 'poloj3614@gmail.com',
      phone: '+57 300 252 1314',
      subject: 'Prueba del Sistema KillaVibes ✅',
      message: '¡Hola! Esta es una prueba del sistema de contacto de KillaVibes. Si recibes este email, todo está funcionando PERFECTAMENTE. 🎉\n\nPuedes proceder a usar el formulario en el sitio web.',
      timestamp: new Date().toISOString()
    };

    console.log('📤 Enviando email de prueba...');
    const emailService = require('../services/emailService');
    const result = await emailService.sendContactEmail(testData);

    console.log('✅ PRUEBA EXITOSA');
    
    res.json({
      success: true,
      message: '✅ PRUEBA EXITOSA - El sistema está funcionando correctamente',
      data: {
        test: 'completado',
        email: 'enviado',
        status: 'operacional'
      }
    });

  } catch (error) {
    console.error('❌ PRUEBA FALLIDA:', error.message);
    res.status(500).json({
      success: false,
      message: '❌ PRUEBA FALLIDA: ' + error.message,
      instruction: 'Verifica la configuración de SendGrid'
    });
  }
});

// GET /api/contact/status - ESTADO DEL SISTEMA
router.get('/status', (req, res) => {
  res.json({
    success: true,
    service: 'KillaVibes Contact API',
    status: '🟢 OPERACIONAL',
    version: '2.0',
    features: {
      sendGrid: '🟢 ACTIVO',
      contactForm: '🟢 ACTIVO',
      emailTemplates: '🟢 ACTIVO'
    },
    timestamp: new Date().toISOString()
  });
});

module.exports = router;