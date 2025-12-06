/**
 * @description Utilidades para sanitización de datos
 * Previene XSS, SQL Injection y otros ataques
 */

/**
 * @function sanitizeHtml
 * @description Elimina HTML peligroso de strings
 * 
 * @param {string} str - String a sanitizar
 * @returns {string} String sanitizado
 */
const sanitizeHtml = (str) => {
  if (typeof str !== 'string') return str;

  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * @function sanitizeObject
 * @description Sanitiza recursivamente todos los strings de un objeto
 * 
 * @param {Object} obj - Objeto a sanitizar
 * @returns {Object} Objeto sanitizado
 */
const sanitizeObject = (obj) => {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitizeHtml(obj) : obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      sanitized[key] = sanitizeObject(obj[key]);
    }
  }

  return sanitized;
};

/**
 * @function removeEmptyFields
 * @description Elimina campos vacíos, null o undefined
 * 
 * @param {Object} obj - Objeto a limpiar
 * @returns {Object} Objeto sin campos vacíos
 */
const removeEmptyFields = (obj) => {
  if (typeof obj !== 'object' || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.filter(item => item != null).map(removeEmptyFields);
  }

  const cleaned = {};
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];
      
      // Mantener false y 0, pero eliminar null, undefined, ''
      if (value !== null && value !== undefined && value !== '') {
        cleaned[key] = typeof value === 'object' 
          ? removeEmptyFields(value) 
          : value;
      }
    }
  }

  return cleaned;
};

/**
 * @function escapeRegex
 * @description Escapa caracteres especiales para uso en RegExp
 * 
 * @param {string} str - String a escapar
 * @returns {string} String escapado
 */
const escapeRegex = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

/**
 * @function sanitizeEmail
 * @description Normaliza y sanitiza emails
 * 
 * @param {string} email - Email a sanitizar
 * @returns {string} Email sanitizado
 */
const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;
  
  return email
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '');
};

/**
 * @function sanitizePhone
 * @description Normaliza números de teléfono
 * 
 * @param {string} phone - Teléfono a sanitizar
 * @returns {string} Teléfono sanitizado
 */
const sanitizePhone = (phone) => {
  if (typeof phone !== 'string') return phone;
  
  // Eliminar todo excepto números, +, () y espacios
  return phone.replace(/[^0-9\+\(\)\s\-]/g, '').trim();
};

/**
 * @function stripTags
 * @description Elimina todas las etiquetas HTML
 * 
 * @param {string} str - String con HTML
 * @returns {string} String sin HTML
 */
const stripTags = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/<[^>]*>/g, '');
};

/**
 * @function sanitizeFilename
 * @description Sanitiza nombres de archivo
 * 
 * @param {string} filename - Nombre de archivo
 * @returns {string} Nombre sanitizado
 */
const sanitizeFilename = (filename) => {
  if (typeof filename !== 'string') return filename;
  
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .replace(/_{2,}/g, '_')
    .toLowerCase();
};

/**
 * @function sanitizeUrl
 * @description Sanitiza URLs
 * 
 * @param {string} url - URL a sanitizar
 * @returns {string} URL sanitizada
 */
const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return url;
  
  // Eliminar espacios y normalizar
  url = url.trim().toLowerCase();
  
  // Validar que empiece con http o https
  if (!url.match(/^https?:\/\//)) {
    return '';
  }
  
  return url;
};

/**
 * @function deepClone
 * @description Clonación profunda de objetos
 * 
 * @param {*} obj - Objeto a clonar
 * @returns {*} Clon del objeto
 */
const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  
  if (obj instanceof Date) {
    return new Date(obj.getTime());
  }
  
  if (obj instanceof Array) {
    return obj.map(item => deepClone(item));
  }
  
  if (obj instanceof Object) {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

/**
 * @function normalizeString
 * @description Normaliza strings (sin acentos, lowercase, sin espacios extra)
 * 
 * @param {string} str - String a normalizar
 * @returns {string} String normalizado
 */
const normalizeString = (str) => {
  if (typeof str !== 'string') return str;
  
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remover acentos
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' '); // Espacios múltiples a uno
};

module.exports = {
  sanitizeHtml,
  sanitizeObject,
  removeEmptyFields,
  escapeRegex,
  sanitizeEmail,
  sanitizePhone,
  stripTags,
  sanitizeFilename,
  sanitizeUrl,
  deepClone,
  normalizeString
};



