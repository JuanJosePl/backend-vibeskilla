const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const { errorConverter, errorHandler } = require('./core/errors/errorHandler');

const app = express();

// ============================================
// CONFIGURACIÓN DE SEGURIDAD
// ============================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    }
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use(mongoSanitize());

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://front-vibeskilla.vercel.app',
  'https://front-vibeskilla-jcrs.vercel.app',
  'https://front-vibeskilla-h9haomdkx-juanjosepls-projects.vercel.app',
  'https://front-vibeskilla-git-main-juanjosepls-projects.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Origen ${origin} no permitido por CORS`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

app.options('*', cors());

// ============================================
// RATE LIMITING CONFIGURADO POR SEVERIDAD
// ============================================

// Rate limiter general (todas las rutas /api)
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 60,
  message: {
    success: false,
    message: 'Demasiadas peticiones desde esta IP, por favor intenta de nuevo en 15 minutos'
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.path === '/'
});

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Solo 5 mensajes cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados mensajes enviados. Intenta de nuevo en 15 minutos'
  }
});

app.use('/api/', limiter);

// Rate limiter para autenticación (más restrictivo)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Demasiados intentos de autenticación, por favor intenta de nuevo en 15 minutos'
  }
});

// ✅ NUEVO: Rate limiter para orders (crítico en producción)
const orderLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Máximo 10 órdenes cada 15 minutos
  message: {
    success: false,
    message: 'Demasiadas órdenes creadas. Por favor intenta de nuevo en 15 minutos'
  }
});

// ✅ NUEVO: Rate limiter para payments (crítico)
const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5, // Máximo 5 intentos de pago cada 15 minutos
  message: {
    success: false,
    message: 'Demasiados intentos de pago. Por favor intenta de nuevo en 15 minutos'
  }
});

// ============================================
// MIDDLEWARES GLOBALES
// ============================================

if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined'));
}

app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// ============================================
// HEALTH CHECK Y RUTAS DE SISTEMA
// ============================================

app.get('/health', (req, res) => {
  res.json({
    success: true,
    status: 'OK',
    service: 'VibesKilla API',
    version: '4.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    database: 'connected'
  });
});

app.get('/', (req, res) => {
  res.json({ 
    success: true,
    message: 'VibesKilla E-commerce API',
    version: '4.0.0',
    architecture: 'Clean Architecture + DDD + Service Layer Pattern',
    environment: process.env.NODE_ENV || 'development',
    documentation: '/api/docs',
    modules: {
      auth: '/api/auth',
      products: '/api/products',
      categories: '/api/categories',
      cart: '/api/cart',
      orders: '/api/orders',
      payments: '/api/payments',
      reviews: '/api/reviews',
      contact: '/api/contact',
      wishlist: '/api/wishlist',
      search: '/api/search',
      userActivity: '/api/activity',
      admin: '/api/admin'
    }
  });
});

app.get('/api/docs', (req, res) => {
  res.json({
    success: true,
    message: 'API Documentation - VibesKilla Ecommerce',
    version: '4.0.0',
    baseURL: `${req.protocol}://${req.get('host')}/api`,
    businessFlow: 'Usuario → Carrito → Orden → Pago → Confirmación WhatsApp',
    endpoints: {
      auth: {
        register: 'POST /api/auth/register',
        login: 'POST /api/auth/login',
        profile: 'GET /api/auth/profile (protected)',
        updateProfile: 'PUT /api/auth/profile (protected)',
        refreshToken: 'POST /api/auth/refresh-token'
      },
      products: {
        list: 'GET /api/products',
        search: 'GET /api/products/search?q=query',
        getOne: 'GET /api/products/:slug',
        featured: 'GET /api/products/featured',
        topSelling: 'GET /api/products/top-selling',
        create: 'POST /api/products (Admin)',
        update: 'PUT /api/products/:id (Admin)',
        delete: 'DELETE /api/products/:id (Admin)'
      },
      categories: {
        list: 'GET /api/categories',
        tree: 'GET /api/categories/tree',
        getOne: 'GET /api/categories/:slug',
        create: 'POST /api/categories (Admin)',
        update: 'PUT /api/categories/:id (Admin)',
        delete: 'DELETE /api/categories/:id (Admin)'
      },
      cart: {
        get: 'GET /api/cart (protected)',
        add: 'POST /api/cart/items (protected)',
        update: 'PUT /api/cart/items/:productId (protected)',
        remove: 'DELETE /api/cart/items/:productId (protected)',
        clear: 'DELETE /api/cart (protected)'
      },
      orders: {
        create: 'POST /api/orders (protected)',
        list: 'GET /api/orders (protected)',
        getOne: 'GET /api/orders/:id (protected)',
        tracking: 'GET /api/orders/:id/tracking (protected)',
        cancel: 'PUT /api/orders/:id/cancel (protected)',
        return: 'POST /api/orders/:id/return (protected)',
        adminList: 'GET /api/orders/admin/all (Admin)',
        adminUpdate: 'PUT /api/orders/admin/:id (Admin)',
        adminRefund: 'POST /api/orders/admin/:id/refund (Admin)'
      },
      payments: {
        createIntent: 'POST /api/payments/create-intent (protected)',
        confirm: 'POST /api/payments/confirm (protected)',
        webhook: 'POST /api/payments/webhook',
        history: 'GET /api/payments/history (protected)'
      },
      reviews: {
        getProductReviews: 'GET /api/reviews/products/:productId',
        create: 'POST /api/reviews/products/:productId (protected)',
        update: 'PUT /api/reviews/:id (protected)',
        delete: 'DELETE /api/reviews/:id (protected)'
      },
      wishlist: {
        get: 'GET /api/wishlist (protected)',
        add: 'POST /api/wishlist/items (protected)',
        remove: 'DELETE /api/wishlist/items/:productId (protected)',
        clear: 'DELETE /api/wishlist (protected)'
      },
      search: {
        suggestions: 'GET /api/search/suggestions?q=query',
        popular: 'GET /api/search/popular',
        trending: 'GET /api/search/trending'
      },
      contact: {
        send: 'POST /api/contact',
        adminList: 'GET /api/contact/admin/messages (Admin)'
      },
      userActivity: {
        list: 'GET /api/activity (protected)',
        stats: 'GET /api/activity/stats (protected)'
      },
      admin: {
        dashboard: 'GET /api/admin/dashboard',
        users: 'GET /api/admin/users',
        userDetails: 'GET /api/admin/users/:id',
        deleteUser: 'DELETE /api/admin/users/:id'
      }
    }
  });
});

// ============================================
// MONTAR RUTAS DE MÓDULOS
// ============================================

const authRoutes = require('./modules/auth/auth.routes');
const productRoutes = require('./modules/products/product.routes');
const categoryRoutes = require('./modules/categories/category.routes');
const cartRoutes = require('./modules/cart/cart.routes');
const reviewRoutes = require('./modules/reviews/review.routes');
const wishlistRoutes = require('./modules/wishlist/wishlist.routes');
const searchRoutes = require('./modules/search/search.routes');
const contactRoutes = require('./modules/contact/contact.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const activityRoutes = require('./modules/userActivity/activity.routes');

// ✅ IMPORTAR CUANDO ESTÉN LISTOS:
// const orderRoutes = require('./modules/orders/order.routes');
// const paymentRoutes = require('./modules/payments/payment.routes');

// Rutas públicas y autenticación
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/contact', contactLimiter , contactRoutes);

// Rutas protegidas (requieren autenticación)
app.use('/api/cart', cartRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/activity', activityRoutes);

// ✅ DESCOMENTAR CUANDO ESTÉN LISTOS:
// app.use('/api/orders', orderLimiter, orderRoutes);
// app.use('/api/payments', paymentLimiter, paymentRoutes);

// Rutas administrativas
app.use('/api/admin', adminRoutes);

// ============================================
// MANEJO DE ERRORES
// ============================================

app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Ruta ${req.originalUrl} no encontrada`,
    suggestion: 'Verifica la URL o consulta /api/docs para ver las rutas disponibles',
    availableModules: [
      '/api/auth',
      '/api/products',
      '/api/categories',
      '/api/cart',
      '/api/reviews',
      '/api/wishlist',
      '/api/search',
      '/api/contact',
      '/api/activity',
      '/api/admin'
      // '/api/orders', // ✅ Descomentar cuando esté listo
      // '/api/payments' // ✅ Descomentar cuando esté listo
    ]
  });
});

app.use(errorConverter);
app.use(errorHandler);

module.exports = app;