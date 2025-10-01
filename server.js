require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares
app.use(cors({
  origin: function (origin, callback) {
    const allowedOrigins = [
      'https://backend-vibeskilla.onrender.com',
      'http://localhost:3000'
    ];
    
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Importar rutas
const authRoutes = require('./routes/authRoutes');

// Usar rutas
app.use('/api/auth', authRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 API VibesKilla - Funcionando correctamente',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString()
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'VibesKilla API',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// ✅ SOLUCIÓN DEFINITIVA: Manejo de rutas no encontradas
// Usamos un middleware regular sin comodín problemático
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /',
      'GET /health',
      'POST /api/auth/register',
      'POST /api/auth/login', 
      'GET /api/auth/profile',
      'PUT /api/auth/profile'
    ]
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  // Error de CORS
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS'
    });
  }
  
  // Error de validación de MongoDB
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors
    });
  }
  
  // Error de duplicado en MongoDB
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'El email ya está registrado'
    });
  }
  
  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  // Error general
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('🚀 VIBESKILLA API - INICIADO CORRECTAMENTE');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 URL: https://backend-vibeskilla.onrender.com`);
  console.log('='.repeat(50));
});