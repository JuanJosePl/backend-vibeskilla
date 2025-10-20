require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');
const path = require('path');

// Conectar a la base de datos
connectDB();

const app = express();

// ✅ CONFIGURACIÓN CORS CORREGIDA - SIN BARRAS AL FINAL
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://front-vibeskilla.vercel.app', // ✅ Sin barra al final
  'https://front-vibeskilla-h9haomdkx-juanjosepls-projects.vercel.app', // ✅ Sin barra al final
  'https://front-vibeskilla-git-main-juanjosepls-projects.vercel.app', // ✅ Agregar este también
  process.env.CLIENT_URL
].filter(Boolean);

// ✅ Configuración SIMPLIFICADA de CORS que funciona
app.use(cors({
  origin: allowedOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// ✅ Middleware para manejar preflight OPTIONS requests
app.options('*', cors());

// Middlewares de seguridad y parsing
app.use(express.json({ 
  limit: '10mb'
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb' 
}));

// Logging de requests mejorado
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path} - Origin: ${req.headers.origin}`);
  console.log('Allowed Origins:', allowedOrigins);
  next();
});

// El resto de tu código se mantiene igual...
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'VibesKilla API v3.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin
    }
  });
});

// Importar y usar rutas...
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const cartRoutes = require('./routes/cartRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);

// Ruta principal
app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: '🚀 API VibesKilla - Ecommerce Completo',
    version: '3.0.0',
    environment: process.env.NODE_ENV || 'development',
    cors: {
      allowedOrigins: allowedOrigins,
      currentOrigin: req.headers.origin
    }
  });
});

// Manejo de errores
app.use((error, req, res, next) => {
  console.error('Error:', error);
  
  if (error.message === 'Not allowed by CORS') {
    return res.status(403).json({
      success: false,
      message: 'Origen no permitido por CORS',
      allowedOrigins: allowedOrigins,
      yourOrigin: req.headers.origin
    });
  }
  
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(70));
  console.log('🚀 VIBESKILLA API v3.0 - ECOMMERCE COMPLETO');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  console.log('📍 Orígenes permitidos:');
  allowedOrigins.forEach(origin => {
    console.log(`   ✅ ${origin}`);
  });
  console.log('='.repeat(70));
});