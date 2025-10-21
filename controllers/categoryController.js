const Category = require('../models/Category');

// @desc    Obtener todas las categorías
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort({ order: 1, name: 1 })
      .populate('parentCategory', 'name slug');

    res.json({
      success: true,
      count: categories.length,
      data: categories
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener categorías',
      error: error.message
    });
  }
};

// @desc    Obtener categoría por slug
// @route   GET /api/categories/:slug
// @access  Public
const getCategoryBySlug = async (req, res) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug, 
      isActive: true 
    }).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener la categoría',
      error: error.message
    });
  }
};

// @desc    Crear categoría
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    const category = await Category.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Categoría creada exitosamente',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El nombre o slug de la categoría ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear categoría',
      error: error.message
    });
  }
};

// @desc    Actualizar categoría
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría actualizada exitosamente',
      data: category
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El nombre o slug de la categoría ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar categoría',
      error: error.message
    });
  }
};

// @desc    Eliminar categoría
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findByIdAndDelete(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        message: 'Categoría no encontrada'
      });
    }

    res.json({
      success: true,
      message: 'Categoría eliminada exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar categoría',
      error: error.message
    });
  }
};

// @desc    Obtener productos relacionados
// @route   GET /api/products/related/:productId
// @access  Public
const getRelatedProducts = async (req, res) => {
  try {
    const { productId } = req.params;
    const { category, limit = 4 } = req.query;

    // Validar que el producto exista
    const currentProduct = await Product.findById(productId);
    if (!currentProduct) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Construir query para productos relacionados
    const query = {
      _id: { $ne: productId }, // Excluir el producto actual
      status: 'active',
      isPublished: true
    };

    // Si se proporciona categoría, usarla, sino usar las categorías del producto actual
    if (category) {
      query.categories = category;
    } else if (currentProduct.categories && currentProduct.categories.length > 0) {
      query.categories = { $in: currentProduct.categories };
    }

    // Si no hay categorías, buscar por misma marca o productos destacados
    if (!query.categories) {
      if (currentProduct.brand) {
        query.brand = currentProduct.brand;
      } else {
        // Fallback a productos destacados
        query.isFeatured = true;
      }
    }

    // Obtener productos relacionados
    const relatedProducts = await Product.find(query)
      .select('name price comparePrice images slug shortDescription isFeatured brand stock')
      .populate('categories', 'name slug')
      .limit(parseInt(limit))
      .sort({ 
        isFeatured: -1, 
        createdAt: -1,
        salesCount: -1 
      });

    // Si no hay suficientes productos relacionados, completar con productos populares
    if (relatedProducts.length < limit) {
      const additionalProducts = await Product.find({
        _id: { $nin: [productId, ...relatedProducts.map(p => p._id)] },
        status: 'active',
        isPublished: true
      })
      .select('name price comparePrice images slug shortDescription isFeatured brand stock')
      .populate('categories', 'name slug')
      .limit(limit - relatedProducts.length)
      .sort({ salesCount: -1, createdAt: -1 });

      relatedProducts.push(...additionalProducts);
    }

    res.json({
      success: true,
      count: relatedProducts.length,
      data: relatedProducts
    });

  } catch (error) {
    console.error('Error al obtener productos relacionados:', error);
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos relacionados',
      error: error.message
    });
  }
};

module.exports = {
  getCategories,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
  getRelatedProducts
};