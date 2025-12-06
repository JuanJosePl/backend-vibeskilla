/**
 * @function paginate
 * @description Utilidad para paginación consistente
 * 
 * @param {Object} model - Modelo de Mongoose
 * @param {Object} query - Query de búsqueda
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Datos paginados
 * 
 * @example
 * const result = await paginate(Product, { status: 'active' }, {
 *   page: 1,
 *   limit: 20,
 *   sort: '-createdAt',
 *   populate: 'categories'
 * });
 */
const paginate = async (model, query = {}, options = {}) => {
  const {
    page = 1,
    limit = 20,
    sort = '-createdAt',
    select = '',
    populate = ''
  } = options;

  // Validar y sanitizar parámetros
  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit))); // Max 100 items por página
  const skip = (pageNum - 1) * limitNum;

  // Construir query
  let queryBuilder = model.find(query);

  // Aplicar select si existe
  if (select) {
    queryBuilder = queryBuilder.select(select);
  }

  // Aplicar populate si existe
  if (populate) {
    if (typeof populate === 'string') {
      queryBuilder = queryBuilder.populate(populate);
    } else if (Array.isArray(populate)) {
      populate.forEach(pop => {
        queryBuilder = queryBuilder.populate(pop);
      });
    } else {
      queryBuilder = queryBuilder.populate(populate);
    }
  }

  // Ejecutar query con paginación
  const [data, total] = await Promise.all([
    queryBuilder
      .sort(sort)
      .limit(limitNum)
      .skip(skip)
      .lean(),
    model.countDocuments(query)
  ]);

  const totalPages = Math.ceil(total / limitNum);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    }
  };
};

/**
 * @function paginateAggregate
 * @description Paginación para pipelines de agregación
 * 
 * @param {Object} model - Modelo de Mongoose
 * @param {Array} pipeline - Pipeline de agregación
 * @param {Object} options - Opciones de paginación
 * @returns {Promise<Object>} Datos paginados
 * 
 * @example
 * const result = await paginateAggregate(Order, [
 *   { $match: { status: 'completed' } },
 *   { $group: { _id: '$user', total: { $sum: '$totalAmount' } } }
 * ], { page: 1, limit: 20 });
 */
const paginateAggregate = async (model, pipeline = [], options = {}) => {
  const {
    page = 1,
    limit = 20
  } = options;

  const pageNum = Math.max(1, parseInt(page));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
  const skip = (pageNum - 1) * limitNum;

  // Agregar stages de paginación al pipeline
  const paginatedPipeline = [
    ...pipeline,
    {
      $facet: {
        data: [
          { $skip: skip },
          { $limit: limitNum }
        ],
        metadata: [
          { $count: 'total' }
        ]
      }
    }
  ];

  const [result] = await model.aggregate(paginatedPipeline);

  const data = result.data || [];
  const total = result.metadata[0]?.total || 0;
  const totalPages = Math.ceil(total / limitNum);

  return {
    data,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: totalPages,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1,
      nextPage: pageNum < totalPages ? pageNum + 1 : null,
      prevPage: pageNum > 1 ? pageNum - 1 : null
    }
  };
};

module.exports = {
  paginate,
  paginateAggregate
};