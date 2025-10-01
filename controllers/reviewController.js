const Review = require('../models/Review');
const Product = require('../models/Product');

// @desc    Obtener reviews de un producto
// @route   GET /api/products/:productId/reviews
// @access  Public
const getProductReviews = async (req, res) => {
  try {
    const reviews = await Review.find({
      product: req.params.productId,
      isApproved: true
    })
    .populate('user', 'profile.firstName profile.lastName')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      count: reviews.length,
      data: reviews
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener reviews',
      error: error.message
    });
  }
};

// @desc    Crear review
// @route   POST /api/products/:productId/reviews
// @access  Private
const createReview = async (req, res) => {
  try {
    const { productId } = req.params;
    
    // Verificar si el producto existe
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Verificar si el usuario ya hizo una review
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        message: 'Ya has hecho una review para este producto'
      });
    }

    const review = await Review.create({
      ...req.body,
      product: productId,
      user: req.user._id
    });

    await review.populate('user', 'profile.firstName profile.lastName');

    res.status(201).json({
      success: true,
      message: 'Review creada exitosamente',
      data: review
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Ya has hecho una review para este producto'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear review',
      error: error.message
    });
  }
};

// @desc    Actualizar review
// @route   PUT /api/reviews/:id
// @access  Private
const updateReview = async (req, res) => {
  try {
    const review = await Review.findOne({
      _id: req.params.id,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review no encontrada'
      });
    }

    Object.assign(review, req.body);
    await review.save();

    await review.populate('user', 'profile.firstName profile.lastName');

    res.json({
      success: true,
      message: 'Review actualizada exitosamente',
      data: review
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al actualizar review',
      error: error.message
    });
  }
};

// @desc    Eliminar review
// @route   DELETE /api/reviews/:id
// @access  Private
const deleteReview = async (req, res) => {
  try {
    const review = await Review.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id
    });

    if (!review) {
      return res.status(404).json({
        success: false,
        message: 'Review no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Review eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar review',
      error: error.message
    });
  }
};

module.exports = {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview
};