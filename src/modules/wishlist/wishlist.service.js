const Wishlist = require('./wishlist.model');
const Product = require('../products/product.model');
const ApiError = require('../../core/errors/ApiError');

/**
 * @class WishlistService
 * @description Lógica de negocio para wishlist
 * 
 * Responsabilidades:
 * - CRUD de wishlist
 * - Validación de productos
 * - Notificaciones de precio/disponibilidad
 */
class WishlistService {
  /**
   * Obtener o crear wishlist del usuario
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Wishlist
   */
  async getOrCreateWishlist(userId) {
    let wishlist = await Wishlist.findOne({ user: userId })
      .populate('items.product', 'name slug price comparePrice images stock status isPublished')
      .lean();

    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
      wishlist = await Wishlist.findById(wishlist._id)
        .populate('items.product', 'name slug price comparePrice images stock status isPublished')
        .lean();
    }

    // Enriquecer items con info de cambios
    if (wishlist.items) {
      wishlist.items = wishlist.items.map(item => ({
        ...item,
        priceChanged: item.priceWhenAdded && item.product.price !== item.priceWhenAdded,
        priceDropped: item.priceWhenAdded && item.product.price < item.priceWhenAdded,
        priceDifference: item.priceWhenAdded ? item.product.price - item.priceWhenAdded : 0,
        isAvailable: item.product.status === 'active' && item.product.isPublished && item.product.stock > 0
      }));
    }

    return wishlist;
  }

  /**
   * Agregar producto a la wishlist
   * 
   * @param {string} userId - ID del usuario
   * @param {string} productId - ID del producto
   * @param {Object} options - Opciones
   * @returns {Promise<Object>} Wishlist actualizada
   */
  async addItem(userId, productId, options = {}) {
    // Verificar que el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      throw ApiError.notFound('Producto no encontrado');
    }

    // Obtener o crear wishlist
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    // Agregar item usando método del modelo
    await wishlist.addItem(productId, {
      price: product.price,
      ...options
    });

    // Retornar populada
    return await this.getOrCreateWishlist(userId);
  }

  /**
   * Eliminar producto de la wishlist
   * 
   * @param {string} userId - ID del usuario
   * @param {string} productId - ID del producto
   * @returns {Promise<Object>} Wishlist actualizada
   */
  async removeItem(userId, productId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      throw ApiError.notFound('Wishlist no encontrada');
    }

    await wishlist.removeItem(productId);

    return await this.getOrCreateWishlist(userId);
  }

  /**
   * Limpiar wishlist
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Wishlist vacía
   */
  async clearWishlist(userId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      throw ApiError.notFound('Wishlist no encontrada');
    }

    await wishlist.clear();

    return await this.getOrCreateWishlist(userId);
  }

  /**
   * Verificar si un producto está en la wishlist
   * 
   * @param {string} userId - ID del usuario
   * @param {string} productId - ID del producto
   * @returns {Promise<boolean>}
   */
  async hasProduct(userId, productId) {
    const wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) return false;

    return wishlist.hasProduct(productId);
  }

  /**
   * Mover items de wishlist a carrito
   * 
   * @param {string} userId - ID del usuario
   * @param {Array} productIds - IDs de productos a mover
   * @returns {Promise<Object>}
   */
  async moveToCart(userId, productIds) {
    const Cart = require('../cart/cart.model');

    const wishlist = await Wishlist.findOne({ user: userId })
      .populate('items.product');

    if (!wishlist) {
      throw ApiError.notFound('Wishlist no encontrada');
    }

    let cart = await Cart.findOne({ user: userId });
    if (!cart) {
      cart = await Cart.create({ user: userId, items: [] });
    }

    const movedItems = [];
    for (const productId of productIds) {
      const wishlistItem = wishlist.items.find(item =>
        item.product._id.toString() === productId.toString()
      );

      if (wishlistItem && wishlistItem.product.stock > 0) {
        try {
          await cart.addItem(productId, 1, {});
          await wishlist.removeItem(productId);
          movedItems.push(wishlistItem.product);
        } catch (error) {
          // Si falla al agregar al carrito, continuar con el siguiente
          console.error(`Error moviendo producto ${productId}:`, error.message);
        }
      }
    }

    return {
      movedItems,
      movedCount: movedItems.length
    };
  }

  /**
   * Obtener productos con cambios de precio
   * 
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} Productos con cambios
   */
  async getPriceChanges(userId) {
    const wishlist = await Wishlist.findOne({ user: userId })
      .populate('items.product', 'name slug price comparePrice images');

    if (!wishlist || !wishlist.items.length) {
      return [];
    }

    const changedProducts = wishlist.items
      .filter(item =>
        item.priceWhenAdded &&
        item.product.price !== item.priceWhenAdded
      )
      .map(item => ({
        product: item.product,
        oldPrice: item.priceWhenAdded,
        newPrice: item.product.price,
        difference: item.product.price - item.priceWhenAdded,
        percentageChange: ((item.product.price - item.priceWhenAdded) / item.priceWhenAdded * 100).toFixed(2),
        addedAt: item.addedAt
      }));

    return changedProducts;
  }

  /**
   * Sincroniza wishlist de invitado (guest) con la wishlist del usuario autenticado
   *
   * Flujo:
   * - Recibe items guardados en localStorage (guest)
   * - Evita duplicados
   * - Valida existencia real de productos
   * - Migra solo productos válidos
   * - Mantiene snapshot de precio
   *
   * Este método:
   * - NO borra la wishlist existente
   * - NO lanza error si un producto ya no existe
   * - ES idempotente (puede ejecutarse varias veces sin duplicar)
   *
   * @param {string} userId - ID del usuario autenticado
   * @param {Array} guestItems - Items guest [{ productId }]
   * @returns {Promise<{ migratedCount: number }>}
   */
  async syncGuestWishlist(userId, guestItems = []) {
    // Nada que sincronizar
    if (!Array.isArray(guestItems) || guestItems.length === 0) {
      return { migratedCount: 0 };
    }

    // Obtener o crear wishlist del usuario
    let wishlist = await Wishlist.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await Wishlist.create({ user: userId, items: [] });
    }

    let migratedCount = 0;

    // Migrar items guest → wishlist user
    for (const item of guestItems) {
      if (!item?.productId) continue;

      //  Evitar duplicados
      const exists = wishlist.items.some(
        i => i.product.toString() === item.productId.toString()
      );
      if (exists) continue;

      // Validar que el producto exista
      const product = await Product.findById(item.productId);
      if (!product) continue;

      // Agregar item
      wishlist.items.push({
        product: product._id,
        priceWhenAdded: product.price
      });

      migratedCount++;
    }

    // Persistir solo si hubo cambios
    if (migratedCount > 0) {
      await wishlist.save();
    }

    return { migratedCount };
  }



}

module.exports = new WishlistService();
