const mongoose = require("mongoose")

/**
 * @schema cartItemSchema
 * @description Item del carrito con validaciones y cálculos
 */
const cartItemSchema = new mongoose.Schema(
  {
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "El producto es requerido"],
      index: true,
    },

    variant: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    quantity: {
      type: Number,
      required: [true, "La cantidad es requerida"],
      min: [1, "La cantidad mínima es 1"],
      max: [9999, "La cantidad máxima es 9999"],
      default: 1,
    },

    price: {
      type: Number,
      required: [true, "El precio es requerido"],
      min: [0, "El precio no puede ser negativo"],
    },

    originalPrice: {
      type: Number,
      default: null,
    },

    discount: {
      type: Number,
      default: 0,
      min: 0,
    },

    attributes: {
      size: String,
      color: String,
      material: String,
      custom: mongoose.Schema.Types.Mixed,
    },

    addedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

/**
 * @schema couponSchema
 * @description Estructura de cupón aplicado
 */
const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      uppercase: true,
      required: true,
    },

    discount: {
      type: Number,
      required: true,
      min: 0,
    },

    type: {
      type: String,
      enum: ["percentage", "fixed", "shipping"],
      required: true,
    },

    minPurchase: {
      type: Number,
      default: 0,
    },

    expiresAt: Date,
    appliedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
)

/**
 * @schema cartSchema
 * @description Carrito de compras profesional con persistencia
 *
 * AGREGADO: Cart es raíz
 * VALUE OBJECTS: items, coupon, shipping
 *
 * SOURCE OF TRUTH para carrito
 */
const cartSchema = new mongoose.Schema(
  {
    // Relación con usuario
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "El usuario es requerido"],
      unique: true,
      index: true,
    },

    // Items del carrito
    items: {
      type: [cartItemSchema],
      default: [],
    },

    // Cupón aplicado
    coupon: {
      type: couponSchema,
      default: null,
    },

    // Información de envío
    shippingAddress: {
      firstName: String,
      lastName: String,
      email: String,
      phone: String,
      street: String,
      city: String,
      state: String,
      zipCode: String,
      country: String,
      isDefault: Boolean,
    },

    // Envío
    shippingMethod: {
      type: String,
      enum: ["standard", "express", "overnight", "pickup"],
      default: "standard",
    },

    shippingCost: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Impuestos
    taxRate: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },

    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },

    // Notas especiales
    notes: {
      type: String,
      maxlength: 500,
    },

    // Control de estado
    status: {
      type: String,
      enum: ["active", "abandoned", "converted"],
      default: "active",
      index: true,
    },

    // Fecha de abandono
    abandonedAt: Date,

    // Auditoría
    lastActivityAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
)

// 📌 ÍNDICES COMPUESTOS
cartSchema.index({ user: 1, status: 1 })
cartSchema.index({ status: 1, lastActivityAt: 1 })
cartSchema.index({ "items.product": 1 })

// 📌 TTL para carritos abandonados (30 días)
cartSchema.index(
  { lastActivityAt: 1 },
  { expireAfterSeconds: 2592000, partialFilterExpression: { status: "abandoned" } },
)

/**
 * VIRTUALS: Cálculos automáticos
 */

cartSchema.virtual("subtotal").get(function () {
  return this.items.reduce((total, item) => {
    return total + item.price * item.quantity
  }, 0)
})

cartSchema.virtual("discountAmount").get(function () {
  if (!this.coupon?.code) return 0

  if (this.coupon.type === "percentage") {
    return (this.subtotal * this.coupon.discount) / 100
  } else if (this.coupon.type === "fixed") {
    return Math.min(this.coupon.discount, this.subtotal)
  }

  return 0
})

cartSchema.virtual("shippingDiscount").get(function () {
  return this.coupon?.type === "shipping" ? this.coupon.discount : 0
})

cartSchema.virtual("total").get(function () {
  const beforeTax = this.subtotal - this.discountAmount + (this.shippingCost - this.shippingDiscount)
  const tax = (beforeTax * this.taxRate) / 100
  return beforeTax + tax
})

cartSchema.virtual("itemCount").get(function () {
  return this.items.reduce((count, item) => count + item.quantity, 0)
})

cartSchema.virtual("uniqueItems").get(function () {
  return this.items.length
})

/**
 * @method addItem
 * @description Agrega producto al carrito o incrementa cantidad
 */
cartSchema.methods.addItem = async function (productId, quantity = 1, attributes = {}) {
  const Product = mongoose.model("Product")
  const product = await Product.findById(productId)

  if (!product) {
    throw new Error("Producto no encontrado")
  }

  if (!product.isAvailable() && product.trackQuantity) {
    throw new Error("Producto no disponible")
  }

  // Buscar item existente
  const existingIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      JSON.stringify(item.attributes) === JSON.stringify(attributes),
  )

  if (existingIndex > -1) {
    this.items[existingIndex].quantity += quantity
  } else {
    this.items.push({
      product: productId,
      quantity,
      price: product.price,
      originalPrice: product.comparePrice,
      discount: product.discount,
      attributes,
    })
  }

  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method updateQuantity
 * @description Actualiza cantidad o elimina si es 0
 */
cartSchema.methods.updateQuantity = function (productId, quantity, attributes = {}) {
  const itemIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      JSON.stringify(item.attributes) === JSON.stringify(attributes),
  )

  if (itemIndex > -1) {
    if (quantity <= 0) {
      this.items.splice(itemIndex, 1)
    } else {
      this.items[itemIndex].quantity = quantity
    }
  }

  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method removeItem
 * @description Elimina un item del carrito
 */
cartSchema.methods.removeItem = function (productId, attributes = {}) {
  const itemIndex = this.items.findIndex(
    (item) =>
      item.product.toString() === productId.toString() &&
      JSON.stringify(item.attributes) === JSON.stringify(attributes),
  )

  if (itemIndex > -1) {
    this.items.splice(itemIndex, 1)
  }

  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method clear
 * @description Vacía el carrito
 */
cartSchema.methods.clear = function () {
  this.items = []
  this.coupon = null
  this.shippingAddress = null
  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method applyCoupon
 * @description Aplica un cupón al carrito
 */
cartSchema.methods.applyCoupon = async function (couponData) {
  // Validar monto mínimo
  if (couponData.minPurchase && this.subtotal < couponData.minPurchase) {
    throw new Error(`Compra mínima requerida: $${couponData.minPurchase}`)
  }

  // Validar expiración
  if (couponData.expiresAt && new Date() > couponData.expiresAt) {
    throw new Error("Cupón expirado")
  }

  this.coupon = couponData
  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method abandon
 * @description Marca carrito como abandonado
 */
cartSchema.methods.abandon = function () {
  this.status = "abandoned"
  this.abandonedAt = new Date()
  return this.save()
}

/**
 * @method recover
 * @description Recupera carrito abandonado
 */
cartSchema.methods.recover = function () {
  this.status = "active"
  this.abandonedAt = null
  this.lastActivityAt = new Date()
  return this.save()
}

/**
 * @method toJSON
 * @description Formatea respuesta JSON
 */
cartSchema.methods.toJSON = function () {
  const obj = this.toObject()
  return {
    ...obj,
    items: obj.items || [],
    subtotal: this.subtotal,
    discountAmount: this.discountAmount,
    taxAmount: this.taxAmount,
    total: this.total,
    itemCount: this.itemCount,
  }
}

module.exports = mongoose.model("Cart", cartSchema)
