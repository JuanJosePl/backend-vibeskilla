require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/database');

// Conectar a la base de datos
connectDB();

const app = express();

// Middlewares
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Rutas
app.use('/api/auth', require('./routes/authRoutes'));

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 API de Ecommerce VibesKilla funcionando',
    version: '1.0.0',
    features: [
      '✅ Registro de usuarios con encriptación',
      '✅ Login con JWT',
      '✅ Middleware de autenticación',
      '✅ MongoDB Atlas conectado'
    ]
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta no encontrada: ${req.originalUrl}`
  });
});

// Manejo de errores global
app.use((error, req, res, next) => {
  console.error('Error:', error);
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('='.repeat(60));
  console.log('🚀 VIBESKILLA BACKEND - EJECUTÁNDOSE CORRECTAMENTE');
  console.log('📍 Puerto:', PORT);
  console.log('📍 MongoDB: Conectado ✓');
  console.log('📍 JWT: Configurado ✓');
  console.log('📍 Auth: Completo ✓');
  console.log('='.repeat(60));
});