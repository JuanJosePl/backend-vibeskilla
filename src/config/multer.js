const multer = require('multer');
const path = require('path');
const fs = require('fs');
const ApiError = require('../core/errors/ApiError');

/**
 * @description Configuración de Multer para subida de archivos
 * 
 * Funcionalidades:
 * - Almacenamiento en disco local (solo desarrollo)
 * - Validación de tipos de archivo
 * - Límite de tamaño 5MB
 * - Nombres únicos con timestamp
 * 
 * IMPORTANTE: En producción (Render), el sistema de archivos es efímero.
 * Se recomienda integrar Cloudinary o AWS S3 para almacenamiento persistente.
 */

// Crear directorio uploads si no existe
const uploadDir = path.join(__dirname, '../../uploads');

const ensureUploadDir = () => {
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
    console.log('📁 Directorio uploads creado:', uploadDir);
  }
};

// Crear directorio al cargar el módulo
ensureUploadDir();

/**
 * Configuración de almacenamiento en disco
 */
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // Asegurar que el directorio existe antes de cada upload
    ensureUploadDir();
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Generar nombre único: fieldname-timestamp-random.ext
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9]/g, '-') // Sanitizar nombre
      .toLowerCase();
    cb(null, `${name}-${uniqueSuffix}${ext}`);
  }
});

/**
 * Filtrar tipos de archivo permitidos
 * Solo: JPEG, JPG, PNG, GIF, WEBP
 */
const fileFilter = (req, file, cb) => {
  const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/jpg'];
  const allowedExts = /\.(jpeg|jpg|png|gif|webp)$/i;

  const isAllowedMime = allowedMimes.includes(file.mimetype);
  const isAllowedExt = allowedExts.test(path.extname(file.originalname));

  if (isAllowedMime && isAllowedExt) {
    cb(null, true);
  } else {
    cb(
      new ApiError(400, 'Solo se permiten imágenes: JPEG, JPG, PNG, GIF, WEBP'),
      false
    );
  }
};

/**
 * Configuración de Multer
 */
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
    files: 1 // Máximo 1 archivo por request
  },
  fileFilter
});

/**
 * Middleware para manejar errores de multer
 * Convertir errores de Multer en ApiError
 */
const handleUploadError = (error, req, res, next) => {
  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return next(ApiError.badRequest('El archivo es demasiado grande. Máximo 5MB permitido.'));
    }
    if (error.code === 'LIMIT_FILE_COUNT') {
      return next(ApiError.badRequest('Demasiados archivos. Máximo 1 archivo permitido.'));
    }
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return next(ApiError.badRequest('Campo de archivo no esperado.'));
    }
    return next(ApiError.badRequest(`Error de subida: ${error.message}`));
  }
  
  if (error) {
    return next(error);
  }
  
  next();
};

/**
 * Middleware para eliminar archivo si hay error posterior
 */
const cleanupOnError = (req, res, next) => {
  const originalNext = next;
  
  next = (err) => {
    if (err && req.file) {
      // Eliminar archivo subido si hay error
      fs.unlink(req.file.path, (unlinkErr) => {
        if (unlinkErr) {
          console.error('Error al eliminar archivo:', unlinkErr);
        }
      });
    }
    originalNext(err);
  };
  
  originalNext();
};

/**
 * Configuración para subida de múltiples archivos (si se necesita en el futuro)
 */
const uploadMultiple = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5 // Máximo 5 archivos
  },
  fileFilter
});

module.exports = {
  upload,
  uploadMultiple,
  handleUploadError,
  cleanupOnError,
  uploadDir
};


/*

Almacenamiento en disco local no funciona en Render - Render usa sistema de archivos efímero
Falta integración con Cloudinary o S3 - Para producción necesitas almacenamiento persistente
*/