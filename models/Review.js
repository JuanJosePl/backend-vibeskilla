const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  title: {
    type: String,
    trim: true,
    maxlength: 100
  },
  comment: {
    type: String,
    required: true,
    maxlength: 1000
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isApproved: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Un usuario solo puede hacer una review por producto
reviewSchema.index({ product: 1, user: 1 }, { unique: true });

// Índice para ratings
reviewSchema.index({ product: 1, rating: 1 });

// Middleware para actualizar el rating promedio del producto
reviewSchema.post('save', async function() {
  await this.model('Review').calculateProductRating(this.product);
});

reviewSchema.post('remove', async function() {
  await this.model('Review').calculateProductRating(this.product);
});

// Método estático para calcular rating promedio
reviewSchema.statics.calculateProductRating = async function(productId) {
  const stats = await this.aggregate([
    {
      $match: { product: productId, isApproved: true }
    },
    {
      $group: {
        _id: '$product',
        averageRating: { $avg: '$rating' },
        reviewsCount: { $sum: 1 }
      }
    }
  ]);

  if (stats.length > 0) {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      averageRating: stats[0].averageRating,
      reviewsCount: stats[0].reviewsCount
    });
  } else {
    await mongoose.model('Product').findByIdAndUpdate(productId, {
      averageRating: 0,
      reviewsCount: 0
    });
  }
};

module.exports = mongoose.model('Review', reviewSchema);