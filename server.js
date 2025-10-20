require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const path = require('path');

// Conectar a la base de datos
connectDB();

const app = express();

// Configuración de CORS para producción
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://front-vibeskilla-h9haomdkx-juanjosepls-projects.vercel.app/',
  'https://front-vibeskilla.vercel.app/', // Agrega tu dominio principal de Vercel
  process.env.CLIENT_URL // Variable de entorno para más flexibilidad
].filter(Boolean); // Elimina valores undefined

app.use(cors({
  origin: function (origin, callback) {
    // Permitir requests sin origin (como mobile apps o curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.some(allowedOrigin => 
      origin === allowedOrigin || 
      origin.startsWith(allowedOrigin.replace('https://', 'http://'))
    )) {
      callback(null, true);
    } else {
      console.log('CORS bloqueado para origen:', origin);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middlewares de seguridad y parsing
app.use(express.json({ 
  limit: '10mb',
  verify: (req, res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Logging de requests (útil para debug en producción)
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  next();
});

// Servir archivos estáticos de manera más segura
app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
  maxAge: '1d',
  setHeaders: (res, path) => {
    // Headers de seguridad para archivos estáticos
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

// Health check mejorado
app.get('/health', async (req, res) => {
  const healthCheck = {
    success: true,
    status: 'OK',
    service: 'VibesKilla API v3.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    environment: process.env.NODE_ENV || 'development',
    database: 'Connected', // Puedes verificar conexión a DB aquí
    version: '3.0.0'
  };

  // Verificar conexión a MongoDB
  try {
    const mongoose = require('mongoose');
    healthCheck.database = mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected';
  } catch (error) {
    healthCheck.database = 'Error checking connection';
  }

  res.status(200).json(healthCheck);
});

// Importar rutas
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Usar rutas con prefix
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Ruta principal mejorada
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 API VibesKilla - Ecommerce Completo',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    docs: 'Consulta /health para estado del sistema',
    features: [
      '✅ Sistema de autenticación JWT',
      '✅ Gestión completa de productos y categorías',
      '✅ Sistema de reviews y ratings',
      '✅ Carrito de compras avanzado',
      '✅ Sistema de órdenes y pagos',
      '✅ Búsqueda y filtros avanzados',
      '✅ Cupones y descuentos',
      '✅ API RESTful preparada para producción'
    ],
    endpoints: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      health: '/health'
    }
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
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
      'GET /api/categories/:slug',
      'GET /api/cart',
      'POST /api/cart/items',
      'POST /api/orders',
      'GET /api/orders',
      'POST /api/payments/process'
    ]
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error Global:', {
    message: error.message,
    stack: error.stack,
    url: req.url,
    method: req.method,
    origin: req.headers.origin
  });
  
  // CORS Errors
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido',
      allowedOrigins: allowedOrigins
    });
  }
  
  // MongoDB Errors
  if (error.name === 'ValidationError') {
    const errors = Object.values(error.errors).map(err => err.message);
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errors: errors
    });
  }
  
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    return res.status(400).json({
      success: false,
      message: `${field} ya existe`
    });
  }
  
  // JWT Errors
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }
  
  // Default error
  res.status(error.status || 500).json({
    success: false,
    message: error.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { 
      stack: error.stack,
      details: error 
    })
  });
});

// Configuración del puerto
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('='.repeat(70));
  console.log('🚀 VIBESKILLA API v3.0 - ECOMMERCE COMPLETO');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`📍 Host: ${HOST}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log(`📍 Frontend URL: ${process.env.CLIENT_URL || 'https://vibeskilla-frontend.vercel.app'}`);
  console.log('📍 Características Implementadas:');
  console.log('   ✅ Sistema de autenticación JWT');
  console.log('   ✅ Gestión completa de productos');
  console.log('   ✅ Sistema de categorías jerárquico');
  console.log('   ✅ Reviews y ratings de productos');
  console.log('   ✅ Carrito de compras avanzado');
  console.log('   ✅ Sistema de órdenes completo');
  console.log('   ✅ Procesamiento de pagos');
  console.log('   ✅ Cupones y descuentos');
  console.log('   ✅ Búsqueda y filtros avanzados');
  console.log('   ✅ Upload de imágenes');
  console.log('='.repeat(70));
});

// Manejo graceful de shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  process.exit(0);
});