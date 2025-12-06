const mongoose = require('mongoose');

/**
 * @schema userActivitySchema
 * @description Esquema de actividad del usuario
 *
 * SOURCE OF TRUTH para el módulo userActivity
 */
const userActivitySchema = new mongoose.Schema(
  {
    // Usuario
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    // Tipo de actividad
    activityType: {
      type: String,
      required: [true, "El tipo de actividad es requerido"],
      enum: [
        "page_view",
        "product_view",
        "category_view",
        "search",
        "add_to_cart",
        "remove_from_cart",
        "add_to_wishlist",
        "remove_from_wishlist",
        "checkout_started",
        "order_completed",
        "review_created",
        "login",
        "logout",
        "register",
      ],
    },
    // Recurso relacionado
    resource: {
      resourceType: {
        type: String,
        enum: ["product", "category", "order", "page", "search"],
      },
      resourceId: mongoose.Schema.Types.ObjectId,
      resourceName: String,
      resourceSlug: String,
    },
    // Metadata adicional
    metadata: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
    },
    // Información de sesión
    sessionId: String,
    ipAddress: String,
    userAgent: String,
    device: {
      type: String,
      enum: ["desktop", "mobile", "tablet", "unknown"],
    },
    browser: String,
    os: String,
    // Referrer
    referrer: String,
    // Geolocalización (opcional)
    location: {
      country: String,
      city: String,
      coordinates: {
        lat: Number,
        lng: Number,
      },
    },
    // Duración (para page_view)
    duration: Number, // milisegundos
    // Timestamp
    timestamp: {
      type: Date,
      default: Date.now,
      // ✅ MEJORADO: Índice TTL para auto-eliminar después de 90 días
      expires: 60 * 60 * 24 * 90, // 90 días en segundos
    },
  },
  {
    timestamps: false, // Usamos timestamp custom
  }
);

// 📌 INDEXES
userActivitySchema.index({ user: 1, timestamp: -1 });
userActivitySchema.index({ activityType: 1, timestamp: -1 });
userActivitySchema.index({ "resource.resourceId": 1, activityType: 1 });
userActivitySchema.index({ sessionId: 1 });
userActivitySchema.index({ timestamp: -1 });
// ✅ AGREGADO: Índice TTL para auto-eliminar documentos viejos
userActivitySchema.index({ timestamp: 1 }, { expireAfterSeconds: 60 * 60 * 24 * 90 });

/**
 * @static getRecentActivity
 * @description Obtiene actividad reciente del usuario
 *
 * @param {string} userId
 * @param {number} limit
 * @returns {Promise<Array>}
 */
userActivitySchema.statics.getRecentActivity = async function (
  userId,
  limit = 50
) {
  return await this.find({ user: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * @static getProductViews
 * @description Obtiene vistas de productos
 * 
 *
 * @param {string} userId
 * @param {number} days
 * @returns {Promise<Array>}
 */
userActivitySchema.statics.getProductViews = async function (
  userId,
  days = 30
) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  return await this.aggregate([
    {
      $match: {
        user: userId, // Mongoose hace cast automático
        activityType: "product_view",
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$resource.resourceId",
        viewCount: { $sum: 1 },
        lastViewed: { $max: "$timestamp" },
        productName: { $first: "$resource.resourceName" },
        productSlug: { $first: "$resource.resourceSlug" },
      },
    },
    { $sort: { viewCount: -1 } },
    {
      $project: {
        _id: 0,
        productId: "$_id",
        productName: 1,
        productSlug: 1,
        viewCount: 1,
        lastViewed: 1,
      },
    },
  ]);
};

/**
 * @static getAbandonedCarts
 * @description Detecta carritos abandonados
 *
 * @param {number} hours
 * @returns {Promise<Array>}
 */
userActivitySchema.statics.getAbandonedCarts = async function (hours = 24) {
  const startDate = new Date();
  startDate.setHours(startDate.getHours() - hours);

  return await this.aggregate([
    {
      $match: {
        activityType: "add_to_cart",
        timestamp: { $gte: startDate },
      },
    },
    {
      $group: {
        _id: "$user",
        lastAddToCart: { $max: "$timestamp" },
      },
    },
    {
      $lookup: {
        from: "useractivities",
        let: { userId: "$_id", lastCart: "$lastAddToCart" },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$user", "$$userId"] },
                  {
                    $in: [
                      "$activityType",
                      ["checkout_started", "order_completed"],
                    ],
                  },
                  { $gt: ["$timestamp", "$$lastCart"] },
                ],
              },
            },
          },
        ],
        as: "completedActions",
      },
    },
    {
      $match: {
        completedActions: { $size: 0 },
      },
    },
    {
      $project: {
        _id: 0,
        userId: "$_id",
        lastActivity: "$lastAddToCart",
      },
    },
  ]);
};

module.exports = mongoose.model("UserActivity", userActivitySchema);