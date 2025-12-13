require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/database');
const mongoose = require('mongoose');

/**
 * @description Servidor principal HTTP
 * 
 * Responsabilidades:
 * - Conectar a MongoDB
 * - Iniciar servidor Express
 * - Manejar errores no capturados
 * - Gestionar señales de cierre graceful
 * 
 * Arquitectura:
 * - Clean Architecture
 * - Separation of Concerns
 * - Error Handling Strategy
 */

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'production';

/**
 * Validar variables de entorno críticas
 */
const validateEnv = () => {
  const required = ['MONGODB_URI', 'JWT_SECRET'];
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Error: Variables de entorno faltantes:', missing.join(', '));
    console.error('💡 Asegúrate de configurarlas en Render o en tu archivo .env');
    process.exit(1);
  }
  
  console.log('✅ Variables de entorno validadas correctamente');
};

/**
 * Iniciar servidor
 */
const startServer = async () => {
  try {
    // 1. Validar variables de entorno
    validateEnv();

    // 2. Conectar a MongoDB
    await connectDB();
    console.log('✅ MongoDB Atlas conectado exitosamente');

    // 3. Iniciar servidor HTTP
    const server = app.listen(PORT, '0.0.0.0', () => {
      console.log('\n🚀 ═══════════════════════════════════════════════════════');
      console.log(`🌐 Servidor corriendo en modo: ${NODE_ENV.toUpperCase()}`);
      console.log(`📡 Puerto: ${PORT}`);
      console.log(`📊 Health Check: /health`);
      console.log(`📝 API Docs: /api/docs`);
      console.log('🚀 ═══════════════════════════════════════════════════════');
      console.log('📍 Módulos cargados:');
      console.log('   ✅ AUTH         - Autenticación JWT + RBAC');
      console.log('   ✅ PRODUCTS     - Catálogo de productos');
      console.log('   ✅ CATEGORIES   - Jerarquía de categorías');
      console.log('   ✅ CART         - Carrito de compras persistente');
      console.log('   ✅ WISHLIST     - Lista de deseos con tracking');
      console.log('   ✅ REVIEWS      - Sistema de reseñas con moderación');
      console.log('   ✅ CONTACT      - Formularios de contacto');
      console.log('   ✅ SEARCH       - Analytics de búsqueda');
      console.log('   ✅ ACTIVITY     - Tracking de actividad de usuarios');
      console.log('   ✅ ADMIN        - Panel administrativo completo');
      console.log('   ⏳ ORDERS       - Gestión de órdenes (PENDIENTE)');
      console.log('   ⏳ PAYMENTS     - Procesamiento de pagos (PENDIENTE)');
      console.log('🚀 ═══════════════════════════════════════════════════════');
      console.log('💬 Flujo de negocio: Usuario → Carrito → Orden → Pago → WhatsApp');
      console.log('🚀 ═══════════════════════════════════════════════════════\n');
    });

    // 4. Manejar señales de cierre graceful
    const gracefulShutdown = (signal) => {
      console.log(`\n👋 Señal ${signal} recibida. Cerrando servidor gracefully...`);
      
      // Timeout de 10 segundos para forzar cierre
      const timeout = setTimeout(() => {
        console.error('⏰ Timeout alcanzado. Forzando cierre...');
        process.exit(1);
      }, 10000);

      server.close(async () => {
        console.log('🛑 Servidor HTTP cerrado');
        
        try {
          await mongoose.connection.close();
          console.log('🛑 MongoDB desconectado');
          clearTimeout(timeout);
          process.exit(0);
        } catch (error) {
          console.error('❌ Error al desconectar MongoDB:', error);
          clearTimeout(timeout);
          process.exit(1);
        }
      });
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

  } catch (error) {
    console.error('❌ Error fatal al iniciar el servidor:');
    console.error(error);
    process.exit(1);
  }
};

/**
 * Manejar errores no capturados (última línea de defensa)
 */
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION detectado:');
  console.error('Promesa:', promise);
  console.error('Razón:', reason);
  console.error('💡 Esto indica un bug en el código. Revisa los logs.');
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  console.error('❌ UNCAUGHT EXCEPTION detectado:');
  console.error(error);
  console.error('💡 Esto indica un bug crítico. Revisa el código.');
  process.exit(1);
});

/**
 * Iniciar servidor
 */
startServer();


/*

PROMPT:
Quiero que actúes como un Arquitecto Senior Especialista en Backends Node.js listos para producción. Voy a enviarte uno por uno los archivos más importantes de mi backend (config, core, middleware, módulos completos, app.js, server.js, etc.).
Tu trabajo será analizarlo y hacer TODO lo necesario para dejar mi backend listo para desplegar en producción.
🧩 INSTRUCCIONES QUE SIEMPRE DEBES CUMPLIR CON CADA ARCHIVO QUE TE ENVÍE
Cuando te envíe un archivo, debes responder SIEMPRE dividido así:
1. ANÁLISIS TÉCNICO DEL ARCHIVO (sin inventar reglas)
Explica:
* Qué hace el archivo
* Para qué módulo sirve
* Cómo debería integrarse dentro del backend
* Qué responsabilidades tiene
2. DETECCIÓN DE ERRORES, BUGS Y RIESGOS
Encuentra:
* Conexiones faltantes (imports/exports)
* Rutas que no se están montando
* Servicios sin usar
* Middlewares sin conectar
* Manejo incorrecto de async/await
* Falta de manejo de errores
* Riesgos de seguridad
3. COSAS QUE FALTAN O ESTÁN INCOMPLETAS
Identifica exactamente:
* Funciones incompletas
* Servicios sin lógica
* Validaciones faltantes
* Middlewares no implementados
* Código muerto
* Estructura incompleta
**4. MUY IMPORTANTE → MEJÓRALO
Tienes PERMISO TOTAL para:
✔ mejorar funciones ✔ completar funciones incompletas ✔ agregar la lógica faltante ✔ corregir errores ✔ agregar middleware necesario ✔ completar servicios ✔ mejorar seguridad ✔ mejorar estructura ✔ reescribir partes mal hechas ✔ corregir patrones ✔ mejorar la calidad del código
PERO con estas reglas:
* ❌ No inventes reglas del negocio
* ❌ No cambies la estructura modular
* ❌ No agregues endpoints nuevos
* ❌ No cambies la base de datos sin que yo lo pida
Si algo falta, complétalo de la forma más profesional posible, siempre dentro de la arquitectura actual.
5. VALIDACIONES NECESARIAS
Indica si el archivo requiere:
* Joi / Validator
* Sanitización
* Manejo de roles (roles.js)
* Reforzar permisos
* Middleware de seguridad
6. LISTA DE COSAS NECESARIAS PARA PRODUCCIÓN
Evalúa si cumple:
* CORS configurado
* Helmet
* Rate limiting
* Logging avanzado
* ErrorHandler global
* JWT correcto
* .env bien usado
* Rutas correctamente montadas
* Conexión estable a la BD
Incluye todo lo que falta para subir el backend a hosting.
7. VERSION MEJORADA DEL CÓDIGO (SI ES NECESARIO)
Si hay errores o cosas incompletas en el archivo que te mando, debes devolver:
* Una VERSIÓN MEJORADA del mismo archivo
* Con TODO lo que corregiste
* Sin perder mi lógica
* Sin crear nuevas reglas
* Sin inventar módulos nuevos
Es decir: arreglas el archivo sin tocar el negocio.
8. CHECKLIST FINAL
Lo haces así:
✔ Correcto ⚠ Falta mejorar ❌ Error crítico
Debe ser específico.
🟢 AL FINAL DEL PROYECTO (cuando te mande todos los archivos)
Debes entregarme:
🔵 1. Reporte Final de Auditoría para Producción
* Qué módulos faltan terminar
* Qué conexiones faltan
* Qué rutas faltan montar
* Errores de seguridad
* Cosas que romperían la app en producción
🟣 2. Plan de producción exacto
* Variables .env necesarias
* Config CORS
* Config de seguridad
* Config PM2
* Estructura de logs
* Pruebas Postman obligatorias
* Checklist previo al deploy

ESTOS SON LOS ARCHIVOS QUE TE ENVIARÉ PARA AUDITORÍA COMPLETA
🔥 1. CONFIGURACIÓN (OBLIGATORIO)
Ruta: /src/config/
* database.js
* jwt.js
* multer.js
🔥 2. ARCHIVOS BASE DEL SISTEMA (OBLIGATORIO)
Ruta: /src/
* app.js
* server.js
* .env (estructura sin claves)
* package.json
🧠 3. CORE DEL SISTEMA
/src/core/errors/
* ApiError.js
* errorHandler.js
/src/core/utils/
* catchAsync.js
* generateToken.js
* slugify.js (si existe)
/src/core/constants/
* roles.js
🟦 4. MIDDLEWARES
Ruta: /src/middleware/
* auth.js
* admin.js
* error.js
* cualquier middleware adicional
🟩 5. MÓDULOS DEL ECOMMERCE (completos: model + controller + service + routes + validation)
5.1 AUTH
/src/modules/auth/
* auth.model.js
* auth.controller.js
* auth.service.js
* auth.routes.js
* auth.validation.js
5.2 USERS (no esta este modulo)
/src/modules/users/
* user.model.js
* user.controller.js
* user.service.js
* user.routes.js
* user.validation.js
5.3 PRODUCTS
/src/modules/products/
* product.model.js
* product.controller.js
* product.service.js
* product.routes.js
* product.validation.js
5.4 CATEGORIES
/src/modules/categories/
* category.model.js
* category.controller.js
* category.service.js
* category.routes.js
* category.validation.js
5.5 CART
/src/modules/cart/
* cart.model.js
* cart.controller.js
* cart.service.js
* cart.routes.js
* cart.validation.js
5.6 WISHLIST (si existe)
/src/modules/wishlist/
* wishlist.model.js
* wishlist.controller.js
* wishlist.service.js
* wishlist.routes.js
* wishlist.validation.js
5.7 USER ACTIVITY / LOGS (si existe)
/src/modules/userActivity/
* userActivity.model.js
* userActivity.controller.js
* userActivity.service.js
* userActivity.routes.js
* userActivity.validation.js
5.8 ORDERS (INCOMPLETO — debe decir qué falta)
/src/modules/orders/
* order.model.js
* order.controller.js
* order.service.js
* order.routes.js
* order.validation.js
Quiero que identifiques: “Todo lo que falta para que el módulo orders esté COMPLETAMENTE funcional.”
5.9 PAYMENTS (vacío o incompleto)

5.10 REVIEWS
/src/modules/reviews/
* review.model.js
* review.controller.js
* review.service.js
* review.routes.js
* review.validation.js
5.11 CONTACT
/src/modules/contact/
* contact.controller.js
* contact.service.js
* contact.routes.js
* contact.validation.js
🟧 6. SERVICIOS GLOBALES
/src/services/
* email.service.js
🟪 7. ARCHIVOS OPCIONALES RECOMENDADOS
* README.md
* uploadMiddleware.js
* utils adicionales
* middlewares adicionales
💥 Instrucción final importantísima
Cuando recibas todos estos archivos:
✔ Analiza la arquitectura completa
✔ Detecta lo que falta
✔ Identifica errores
✔ Repara conexiones mal hechas
✔ Mejora funciones mal diseñadas
✔ Añade código faltante
✔ Refactoriza para producción
✔ Señala vulnerabilidades
✔ Sugiere mejoras obligatorias para deploy
✔ Reordena si la estructura lo requiere
Tienes total libertad para:
* Reescribir funciones
* Optimizar lógica
* Simplificar código
* Manejar errores correctamente
* Arreglar imports/exports
* Completar módulos incompletos
* Añadir validaciones
* Mejorar seguridad y rendimiento
Todo sin inventar reglas del negocio.

EN RESUMEN VAS ANALIZAR Y VERIFICAR y decirme que archivo te mando paso a ppaso para ver que mejorar y  QUE FALTA PARA QUE SE PUEDA IR A PPRODUCCION.

YA TE MANDO LOS ARCHIVOS 

esta es toda la estructura 

/*
backend-vibeskilla/
├── src/
│   ├── config/
│   │   ├── database.js✅
│   │   ├── jwt.jsjs✅
│   │   └── multer.js    js✅      ← mover uploadMiddleware aquí
│   │
│   ├── core/                  ← lógica central del proyecto
│   │   ├── errors/
│   │   │   ├── ApiError.js✅
│   │   │   └── errorHandler.js✅
│   │   ├── utils/
│   │   │   ├── generateToken.js✅
│   │   │   ├── catchAsync.js✅
│   │   │   └── 
│   │   └── constants/
│   │       └── roles.js✅
│   │
│   ├── modules/               ← **corazón del modelo modular**
│   │   ├── auth/
│   │   │   ├── auth.model.js✅✅
│   │   │   ├── auth.controller.js✅
│   │   │   ├── auth.service.js✅
│   │   │   ├── auth.routes.js✅
│   │   │   └── auth.validation.js✅
│   │   │
│   │   ├── users/
│   │   │   ├── user.model.js
│   │   │   ├── user.controller.js
│   │   │   ├── user.service.js
│   │   │   ├── user.routes.js
│   │   │   └── user.validation.js
│   │   │
│   │   ├── products/
│   │   │   ├── product.model.js✅
│   │   │   ├── product.controller.js✅
│   │   │   ├── product.service.js✅
│   │   │   ├── product.routes.js✅
│   │   │   └── product.validation.js✅
│   │   │
│   │   ├── categories/
│   │   │   ├── category.model.js✅
│   │   │   ├── category.controller.js✅
│   │   │   ├── category.service.js✅
│   │   │   ├── category.routes.js✅
│   │   │   └── category.validation.js✅
│   │   │
│   │   ├── cart/
│   │   │   ├── cart.model.js✅
│   │   │   ├── cart.controller.js✅
│   │   │   ├── cart.service.js✅
│   │   │   ├── cart.routes.js✅
│   │   │   └── cart.validation.js✅
│   │   │
│   │   ├── orders/
│   │   │   ├── order.model.jsjs✅
│   │   │   ├── order.controller.jsjs✅
│   │   │   ├── order.service.jsjs✅
│   │   │   ├── order.routes.jsjs✅
│   │   │   └── order.validation.jsjs✅
│   │   │
│   │   ├── payments/
│   │   │   ├── payment.model.jsjs✅
│   │   │   ├── payment.controller.jsjs✅
│   │   │   ├── payment.service.jsjs✅
│   │   │   ├── payment.routes.jsjs✅
│   │   │   └── payment.validation.jsjs✅
│   │   │
│   │   ├── reviews/
│   │   │   ├── review.model.jsjs✅
│   │   │   ├── review.controller.jsjs✅
│   │   │   ├── review.service.jsjs✅
│   │   │   ├── review.routes.jsjs✅
│   │   │   └── review.validation.jsjs✅
│   │   │
│   │   ├── contact/
│   │   │   ├── contact.controller.jsjs✅
│   │   │   ├── contact.service.jsjs✅
│   │   │   ├── contact.routes.jsjs✅
│   │   │   └── contact.validation.jsjs✅
│   │
│   ├── services/              ← Servicios globales
│   │   ├── email.service.jsjs✅
│   │   
│   │
│   ├── middleware/
│   │   ├── auth.js✅
│   │   ├── admin.js
│   │   └── error.jsjs✅
│   │
│   ├── app.js       js✅          ← Express App con módulos cargados
│   └── server.jsjs✅
│
├── package.jsonjs✅
└── .env



1:contexto
## 📌 CONTEXTO ACTUAL (para guardar y continuar proyecto)

**Archivos analizados:** `package.json`, `app.js`, `server.js`

**Errores encontrados:**
- Faltaban 3 dependencias críticas (`helmet`, `express-rate-limit`, `morgan`)
- Módulos `admin` y `orders` montados pero no existen
- `connectDB.disconnect()` no existe (corregido a `mongoose.connection.close()`)
- Rate limiting muy permisivo
- Faltaba validación de variables .env

**Cosas completadas:**
- ✅ Corregido `package.json` con dependencias faltantes
- ✅ Eliminado módulos inexistentes de `app.js`
- ✅ Agregado `mongoSanitize` para seguridad
- ✅ Mejorado rate limiting y Helmet CSP
- ✅ Agregado validación de .env en `server.js`
- ✅ Corregido graceful shutdown con timeout

**Mejoras aplicadas:**
- Documentación `/api/docs` con info de flujo WhatsApp
- Rate limit ajustado a producción (60/15min)
- Agregado skip de rate limit para `/health` (importante para Render)
- Agregado timeout de 10s en shutdown
**Falta por revisar:**
1. `/src/config/` (database.js, jwt.js, multer.js)
2. `/src/core/` (errors, utils, constants)
3. `/src/middleware/` (auth.js, error.js)
4. `/src/services/` (email.service.js)
5. Todos los módulos (auth, products, categories, cart, reviews, contact)

**Cómo quedó el sistema:**
- Backend con 6 módulos funcionales

## 🎯 **SIGUIENTE PASO - ENVÍAME ESTOS ARCHIVOS:**
FASE 2: CONFIGURACIÓN CORE

/src/config/database.js
/src/config/jwt.js
/src/config/multer.js


¡Listo para continuar! 🚀


2:contexto 
## 📌 CONTEXTO ACTUAL (continuación)

**Archivos analizados:** `database.js`, `jwt.js`, `multer.js`, `roles.js`, `ApiError.js`, `errorHandler.js`, `catchAsync.js`, `generateToken.js`, `logger.js`, `paginator.js`, `rateLimiter.js`, `sanitize.js`

**Errores encontrados:**
- `database.js`: Export mal estructurado, falta monitoreo de eventos
- `multer.js`: `handleUploadError` usa `throw` en lugar de `next(error)`, no verifica directorio uploads
- `logger.js`: ❌ **Código duplicado completo**, falta definir `customFormat`
- `rateLimiter.js`: Usa Redis sin tenerlo instalado/configurado

**Cosas completadas:**
- ✅ Corregido export de `database.js`
- ✅ Agregados eventos de monitoreo MongoDB
- ✅ Corregido `handleUploadError` en `multer.js`
- ✅ Agregado `cleanupOnError` middleware
- ✅ Corregido `logger.js` (eliminada duplicación)
- ✅ Agregadas funciones extras en `roles.js` (`isAdmin`, `canAccessResource`)

**Mejoras aplicadas:**
- Pool size dinámico (10 dev, 20 prod)
- Validación de `MONGODB_URI` antes de conectar
- Sanitización de nombres de archivo en multer
- Función `refreshAccessToken()` en generateToken
- Creación automática de directorio `logs`

**Falta por revisar:**
1. `/src/middleware/` (auth.js, error.js, admin.js)

## 🎯 **SIGUIENTE PASO - FASE 3:**

Envíame los middlewares:
```
FASE 3: MIDDLEWARES
1. /src/middleware/auth.js
2. /src/middleware/error.js
3. /src/middleware/admin.js (si existe)


CHECKLIST FINAL DE MÓDULOS
auth.service.js❌ / Corregir generateToken()
cart.controller.js⚠️ Typo en comentario


3:contexto
## 📌 CONTEXTO ACTUAL (para guardar y continuar proyecto)

**Archivos analizados hasta ahora:**
- ✅ `package.json`, `app.js`, `server.js`, `.env`
- ✅ `/config/` → database.js, jwt.js, multer.js
- ✅ `/core/errors/` → ApiError.js, errorHandler.js
- ✅ `/core/utils/` → catchAsync.js, generateToken.js, logger.js, paginator.js, rateLimiter.js, sanitize.js
- ✅ `/core/constants/` → roles.js
- ✅ `/middleware/` → auth.js, admin.js, error.js
- ✅ `/modules/auth/` → COMPLETO (5 archivos)
- ✅ `/modules/cart/` → COMPLETO (5 archivos)
- ✅ `/modules/wishlist/` → COMPLETO (5 archivos)

**Errores críticos encontrados y corregidos:**
1. ❌ `auth.service.js` llamaba a `generateToken()` en lugar de `generateAccessToken()`
2. ❌ `logger.js` tenía código duplicado y faltaba definir `customFormat`
3. ❌ `database.js` tenía export mal estructurado
4. ❌ `multer.js` usaba `throw` en middleware en lugar de `next(error)`
5. ⚠️ `auth.controller.js` usa `Error` en lugar de `ApiError`

**Cosas completadas:**
- ✅ Corregido `generateAccessToken()` en auth.service
- ✅ Agregada función `refreshAccessToken()` completa
- ✅ Corregido logger.js (eliminada duplicación)
- ✅ Mejorado `database.js` con eventos de monitoreo
- ✅ Corregido `multer.js` con `handleUploadError` apropiado
- ✅ Agregadas dependencias faltantes a `package.json`

**Mejoras aplicadas:**
- Pool size dinámico en MongoDB (10 dev, 20 prod)
- Validación de variables .env al iniciar
- Rate limiting ajustado (60/15min general, 20/15min auth)
- Helmet CSP configurado correctamente
- MongoSanitize agregado
- Sistema de logging con Winston
- Paginación profesional con `paginator.js`
- Sanitización avanzada con `sanitize.js`

**Módulos funcionales confirmados:**
1. ✅ **AUTH** - Autenticación JWT completa con refresh tokens
2. ✅ **CART** - Carrito persistente con cupones y shipping
3. ✅ **WISHLIST** - Lista de deseos con tracking de precios

**Falta por revisar:**
- `/modules/products/` (5 archivos)
- `/modules/categories/` (5 archivos)
- `/modules/reviews/` (5 archivos)
- `/modules/contact/` (4 archivos)
   /modules/search/   (4 archivos)
   /modules/admin/   (4 archivos)
   /modules/userActivity/  (5 archivos)
   - `/services/email.service.js`
*/