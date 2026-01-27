'use strict';

/**
 * Genera un slug URL-friendly a partir de un texto.
 * Diseñado para uso en eCommerce (productos, categorías, marcas, etc.)
 *
 * Características:
 * - Soporte completo para acentos y caracteres Unicode
 * - Normalización consistente (SEO-friendly)
 * - Prevención de slugs vacíos o inválidos
 * - Configurable (separador, lowercase, strict)
 *
 * @param {string} input - Texto base
 * @param {Object} [options]
 * @param {string} [options.separator='-'] - Separador entre palabras
 * @param {boolean} [options.lowercase=true] - Forzar minúsculas
 * @param {boolean} [options.strict=true] - Elimina caracteres no alfanuméricos
 * @param {string} [options.fallback='item'] - Valor por defecto si el slug queda vacío
 *
 * @returns {string} slug normalizado
 */
function slugify(input, options = {}) {
  if (typeof input !== 'string') {
    return options.fallback || '';
  }

  const {
    separator = '-',
    lowercase = true,
    strict = true,
    fallback = 'item',
  } = options;

  let slug = input
    .trim()
    .normalize('NFD')                     // separa letras de acentos
    .replace(/[\u0300-\u036f]/g, '')      // elimina acentos
    .replace(/['"]/g, '');                // elimina comillas

  if (strict) {
    slug = slug.replace(/[^a-zA-Z0-9\s-]/g, '');
  }

  slug = slug
    .replace(/\s+/g, separator)           // espacios → separador
    .replace(new RegExp(`${separator}+`, 'g'), separator) // separadores duplicados
    .replace(new RegExp(`^${separator}|${separator}$`, 'g'), ''); // trim separadores

  if (lowercase) {
    slug = slug.toLowerCase();
  }

  return slug || fallback;
}

module.exports = slugify;