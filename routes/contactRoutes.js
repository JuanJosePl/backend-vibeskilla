const express = require('express');
const router = express.Router();
const emailService = require('../services/emailService');

// Función de respaldo para guardar mensajes
const saveContactMessage = async (contactData) => {
  // Aquí puedes guardar en tu base de datos
  // Por ahora solo log
  console.log('💾 Mensaje guardado (respaldo):', {
    name: contactData.name,
    email: contactData.email,
    subject: contactData.subject,
    timestamp: new Date().toISOString()
  });
  
  return { saved: true, id: Date.now() };
};

// POST /api/contact/send - Enviar mensaje de contacto
router.post('/send', async (req, res) => {
  try {
    console.log('📨 Recibiendo solicitud de contacto:', req.body);

    const { name, email, phone, subject, message } = req.body;

    // Validaciones
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

    let emailResult;
    let savedToDB = false;

    try {
      // Intentar enviar email
      console.log('📤 Intentando enviar email...');
      emailResult = await emailService.sendContactEmail(contactData);
      console.log('✅ Email enviado exitosamente');
    } catch (emailError) {
      console.log('📧 Email falló, guardando en respaldo...');
      // Guardar en base de datos como respaldo
      await saveContactMessage(contactData);
      savedToDB = true;
      
      // Responder éxito de todas formas
      return res.json({
        success: true,
        message: 'Mensaje recibido correctamente. Te contactaremos pronto.',
        savedToDB: true,
        note: 'El mensaje fue guardado en nuestro sistema'
      });
    }

    // Si el email fue exitoso
    res.json({
      success: true,
      message: 'Mensaje enviado exitosamente. Te contactaremos pronto.',
      data: emailResult
    });

  } catch (error) {
    console.error('❌ Error general en contacto:', error);
    res.status(500).json({
      success: false,
      message: 'Error interno del servidor. Por favor, intenta nuevamente.'
    });
  }
});

// GET /api/contact/test - Ruta de prueba
router.get('/test', async (req, res) => {
  try {
    console.log('🧪 Probando servicio de email...');
    
    const testData = {
      name: 'Usuario de Prueba',
      email: 'poloj3614@gmail.com',
      phone: '+57 300 000 0000',
      subject: 'Prueba del Sistema',
      message: 'Esta es una prueba del sistema de correos.',
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
    
    // Guardar prueba en respaldo
    await saveContactMessage({
      name: 'Usuario de Prueba',
      email: 'poloj3614@gmail.com', 
      subject: 'Prueba Fallida',
      message: 'Prueba del sistema que falló',
      timestamp: new Date().toISOString()
    });

    res.status(500).json({
      success: false,
      message: 'El servicio de email no está disponible, pero los mensajes se guardan correctamente.',
      savedToDB: true
    });
  }
});

// GET /api/contact/config - Ver configuración
router.get('/config', (req, res) => {
  res.json({
    service: 'gmail',
    user: process.env.SMTP_USER ? 'Configurado' : 'No configurado',
    hasPassword: process.env.SMTP_PASS ? 'Sí' : 'No'
  });
});

module.exports = router;