const Product = require('../models/Product');
const Category = require('../models/Category');

// @desc    Obtener todos los productos con filtros
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 12,
      sort = 'createdAt',
      order = 'desc',
      category,
      search,
      minPrice,
      maxPrice,
      status = 'active',
      featured,
      inStock
    } = req.query;

    // Construir query
    let query = { status, isPublished: true };

    // Filtrar por categoría
    if (category) {
      const categoryDoc = await Category.findOne({ slug: category });
      if (categoryDoc) {
        query.categories = categoryDoc._id;
      }
    }

    // Filtrar por búsqueda
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { brand: { $regex: search, $options: 'i' } }
      ];
    }

    // Filtrar por precio
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    // Filtrar por featured
    if (featured !== undefined) {
      query.isFeatured = featured === 'true';
    }

    // Filtrar por stock
    if (inStock === 'true') {
      query.$or = [
        { stock: { $gt: 0 } },
        { allowBackorder: true }
      ];
    }

    // Opciones de paginación y sort
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { [sort]: order === 'desc' ? -1 : 1 },
      populate: ['categories', 'mainCategory']
    };

    // Ejecutar query
    const products = await Product.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit)
      .populate('categories', 'name slug')
      .populate('mainCategory', 'name slug');

    // Contar total
    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      data: products,
      pagination: {
        current: options.page,
        pages: Math.ceil(total / options.limit),
        total
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos',
      error: error.message
    });
  }
};

// @desc    Obtener producto por slug
// @route   GET /api/products/:slug
// @access  Public
const getProductBySlug = async (req, res) => {
  try {
    const product = await Product.findOne({ slug: req.params.slug })
      .populate('categories', 'name slug')
      .populate('mainCategory', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    // Incrementar vistas
    product.views += 1;
    await product.save();

    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener el producto',
      error: error.message
    });
  }
};

// @desc    Obtener productos destacados
// @route   GET /api/products/featured
// @access  Public
const getFeaturedProducts = async (req, res) => {
  try {
    const products = await Product.find({
      isFeatured: true,
      status: 'active',
      isPublished: true
    })
    .limit(8)
    .populate('categories', 'name slug')
    .populate('mainCategory', 'name slug')
    .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al obtener productos destacados',
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
    };

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
}

// @desc    Crear producto
// @route   POST /api/products
// @access  Private/Admin
const createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Producto creado exitosamente',
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El SKU o slug del producto ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al crear producto',
      error: error.message
    });
  }
};

// @desc    Actualizar producto
// @route   PUT /api/products/:id
// @access  Private/Admin
const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('categories', 'name slug');

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto actualizado exitosamente',
      data: product
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'El SKU o slug del producto ya existe'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Error al actualizar producto',
      error: error.message
    });
  }
};

// @desc    Eliminar producto
// @route   DELETE /api/products/:id
// @access  Private/Admin
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      { status: 'archived' },
      { new: true }
    );

    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Producto no encontrado'
      });
    }

    res.json({
      success: true,
      message: 'Producto archivado exitosamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error al eliminar producto',
      error: error.message
    });
  }
};

// @desc    Buscar productos
// @route   GET /api/products/search/:query
// @access  Public
const searchProducts = async (req, res) => {
  try {
    const { query } = req.params;
    const { limit = 10 } = req.query;

    const products = await Product.find({
      $and: [
        { status: 'active', isPublished: true },
        {
          $or: [
            { name: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } },
            { brand: { $regex: query, $options: 'i' } },
            { 'attributes.color': { $regex: query, $options: 'i' } }
          ]
        }
      ]
    })
    .limit(parseInt(limit))
    .select('name slug price images ratings')
    .populate('categories', 'name slug');

    res.json({
      success: true,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error en la búsqueda',
      error: error.message
    });
  }
};

module.exports = {
  getProducts,
  getProductBySlug,
  getFeaturedProducts,
  createProduct,
  updateProduct,
  deleteProduct,
  searchProducts,
  getRelatedProducts
};