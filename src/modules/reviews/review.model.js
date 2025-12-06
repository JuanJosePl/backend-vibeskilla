const mongoose = require('mongoose');

/**
 * @schema reviewSchema
 * @description Esquema de reseñas/valoraciones de productos
 * 
 * SOURCE OF TRUTH para el módulo reviews
 */
const reviewSchema = new mongoose.Schema({
  
  // Referencias
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: [true, 'El producto es requerido'],
    index: true
  },
  
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'El usuario es requerido'],
    index: true
  },
  
  // Contenido de la review
  rating: {
    type: Number,
    required: [true, 'La calificación es requerida'],
    min: [1, 'La calificación mínima es 1'],
    max: [5, 'La calificación máxima es 5'],
    validate: {
      validator: Number.isInteger,
      message: 'La calificación debe ser un número entero'
    }
  },
  
  title: {
    type: String,
    trim: true,
    maxlength: [100, 'El título no puede tener más de 100 caracteres']
  },
  
  comment: {
    type: String,
    required: [true, 'El comentario es requerido'],
    trim: true,
    minlength: [10, 'El comentario debe tener al menos 10 caracteres'],
    maxlength: [1000, 'El comentario no puede tener más de 1000 caracteres']
  },
  
  // Imágenes de la review (opcional)
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: 'Review image'
    }
  }],
  
  // Estado y verificación
  isVerified: {
    type: Boolean,
    default: false // true = usuario compró el producto
  },
  
  isApproved: {
    type: Boolean,
    default: true // Moderación post-publicación
  },
  
  // Utilidad (para futuras features de engagement)
  helpfulCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  reportCount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Metadata
  moderatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  
  moderatedAt: Date
  
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ============================================
// ÍNDICES
// ============================================

// Un usuario solo puede hacer una review por producto (CONSTRAINT)
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Búsquedas optimizadas
reviewSchema.index({ product: 1, isApproved: 1, createdAt: -1 });
reviewSchema.index({ product: 1, rating: 1 });
reviewSchema.index({ isApproved: 1, createdAt: -1 });
reviewSchema.index({ user: 1, createdAt: -1 });

// ============================================
// VIRTUALS
// ============================================

/**
 * @virtual userName
 * @description Retorna nombre completo del usuario (si está populado)
 */
reviewSchema.virtual('userName').get(function() {
  if (this.user && this.user.profile) {
    return `${this.user.profile.firstName} ${this.user.profile.lastName}`;
  }
  return 'Usuario';
});

/**
 * @virtual hasImages
 * @description Verifica si la review tiene imágenes
 */
reviewSchema.virtual('hasImages').get(function() {
  return this.images && this.images.length > 0;
});

// ============================================
// MIDDLEWARE
// ============================================

/**
 * Post-save: Recalcular rating promedio del producto
 */
reviewSchema.post('save', async function(doc) {
  try {
    await this.constructor.calculateProductRating(doc.product);
  } catch (error) {
    console.error('Error en post-save middleware:', error);
  }
});

/**
 * Post-delete: Recalcular rating promedio del producto
 */
reviewSchema.post('findOneAndDelete', async function(doc) {
  if (doc) {
    try {
      await doc.constructor.calculateProductRating(doc.product);
    } catch (error) {
      console.error('Error en post-delete middleware:', error);
    }
  }
});

/**
 * Post-update: Recalcular rating si cambió isApproved o rating
 */
reviewSchema.post('findOneAndUpdate', async function(doc) {
  if (doc) {
    try {
      await doc.constructor.calculateProductRating(doc.product);
    } catch (error) {
      console.error('Error en post-update middleware:', error);
    }
  }
});

// ============================================
// MÉTODOS ESTÁTICOS
// ============================================

/**
 * @static calculateProductRating
 * @description Calcula y actualiza el rating promedio del producto
 * 
 * 
 * @param {ObjectId} productId - ID del producto
 * @returns {Promise<void>}
 */
reviewSchema.statics.calculateProductRating = async function(productId) {
  try {
    const stats = await this.aggregate([
      {
        // ❌ CORREGIDO: Mongoose hace cast automático
        $match: { 
          product: productId, // No necesita mongoose.Types.ObjectId()
          isApproved: true 
        }
      },
      {
        $group: {
          _id: '$product',
          averageRating: { $avg: '$rating' },
          reviewsCount: { $sum: 1 },
          // Distribución de ratings
          fiveStars: {
            $sum: { $cond: [{ $eq: ['$rating', 5] }, 1, 0] }
          },
          fourStars: {
            $sum: { $cond: [{ $eq: ['$rating', 4] }, 1, 0] }
          },
          threeStars: {
            $sum: { $cond: [{ $eq: ['$rating', 3] }, 1, 0] }
          },
          twoStars: {
            $sum: { $cond: [{ $eq: ['$rating', 2] }, 1, 0] }
          },
          oneStar: {
            $sum: { $cond: [{ $eq: ['$rating', 1] }, 1, 0] }
          }
        }
      }
    ]);

    const Product = mongoose.model('Product');

    if (stats.length > 0) {
      const stat = stats[0];
      
      await Product.findByIdAndUpdate(productId, {
        'rating.average': Math.round(stat.averageRating * 10) / 10,
        'rating.count': stat.reviewsCount,
        'rating.distribution._5': stat.fiveStars,
        'rating.distribution._4': stat.fourStars,
        'rating.distribution._3': stat.threeStars,
        'rating.distribution._2': stat.twoStars,
        'rating.distribution._1': stat.oneStar
      });
    } else {
      // No hay reviews, resetear a 0
      await Product.findByIdAndUpdate(productId, {
        'rating.average': 0,
        'rating.count': 0,
        'rating.distribution._5': 0,
        'rating.distribution._4': 0,
        'rating.distribution._3': 0,
        'rating.distribution._2': 0,
        'rating.distribution._1': 0
      });
    }
  } catch (error) {
    console.error('Error calculando rating del producto:', error);
    throw error; // Re-throw para que el caller lo maneje
  }
};

/**
 * @static getProductStats
 * @description Obtiene estadísticas detalladas de reviews de un producto
 * 
 * 
 * @param {ObjectId} productId - ID del producto
 * @returns {Promise<Object>} Estadísticas completas
 */
reviewSchema.statics.getProductStats = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { 
        product: productId, // No necesita mongoose.Types.ObjectId()
        isApproved: true 
      }
    },
    {
      $facet: {
        // Rating promedio y total
        overall: [
          {
            $group: {
              _id: null,
              average: { $avg: '$rating' },
              total: { $sum: 1 }
            }
          }
        ],
        // Distribución de ratings
        distribution: [
          {
            $group: {
              _id: '$rating',
              count: { $sum: 1 }
            }
          },
          { $sort: { _id: -1 } }
        ],
        // Porcentaje de reviews verificadas
        verified: [
          {
            $group: {
              _id: '$isVerified',
              count: { $sum: 1 }
            }
          }
        ]
      }
    }
  ]);

  return stats[0] || {};
};

// ============================================
// MÉTODOS DE INSTANCIA
// ============================================

/**
 * @method markAsHelpful
 * @description Incrementa el contador de útiles
 * @returns {Promise<Review>}
 */
reviewSchema.methods.markAsHelpful = function() {
  this.helpfulCount += 1;
  return this.save();
};

/**
 * @method report
 * @description Incrementa el contador de reportes
 * @returns {Promise<Review>}
 */
reviewSchema.methods.report = function() {
  this.reportCount += 1;
  
  // Auto-moderar si tiene más de 5 reportes
  if (this.reportCount >= 5) {
    this.isApproved = false;
  }
  
  return this.save();
};

/**
 * @method approve
 * @description Aprueba la review (Admin)
 * @param {ObjectId} moderatorId - ID del moderador
 * @returns {Promise<Review>}
 */
reviewSchema.methods.approve = function(moderatorId) {
  this.isApproved = true;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

/**
 * @method reject
 * @description Rechaza la review (Admin)
 * @param {ObjectId} moderatorId - ID del moderador
 * @returns {Promise<Review>}
 */
reviewSchema.methods.reject = function(moderatorId) {
  this.isApproved = false;
  this.moderatedBy = moderatorId;
  this.moderatedAt = new Date();
  return this.save();
};

module.exports = mongoose.model('Review', reviewSchema);