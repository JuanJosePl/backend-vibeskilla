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

// Servir archivos estáticos
app.use('/uploads', express.static('uploads'));

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');

// Usar rutas
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 API VibesKilla - Funcionando correctamente',
    version: '2.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    features: [
      '✅ Sistema de autenticación completo',
      '✅ Gestión de productos y categorías',
      '✅ Sistema de reviews y ratings',
      '✅ Búsqueda y filtros avanzados',
      '✅ API RESTful preparada para producción'
    ]
  });
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'VibesKilla API v2.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Manejo de rutas no encontradas
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
      'GET /api/products',
      'GET /api/products/featured',
      'GET /api/products/search/:query',
      'GET /api/products/:slug',
      'GET /api/categories',
      'GET /api/categories/:slug'
    ]
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS'
    });
  }
  
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors
    });
  }
  
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'El recurso ya existe'
    });
  }
  
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { error: error.message })
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(60));
  console.log('🚀 VIBESKILLA API v2.0 - INICIADO CORRECTAMENTE');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 URL: https://backend-vibeskilla.onrender.com`);
  console.log('📍 Características:');
  console.log('   ✅ Sistema de autenticación JWT');
  console.log('   ✅ Gestión completa de productos');
  console.log('   ✅ Sistema de categorías jerárquico');
  console.log('   ✅ Reviews y ratings de productos');
  console.log('   ✅ Búsqueda y filtros avanzados');
  console.log('='.repeat(60));
});