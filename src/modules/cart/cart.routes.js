const express = require("express");
const router = express.Router();
const cartController = require("./cart.controller");
const {
  validate,
  addItemValidation,
  updateQuantityValidation,
  removeItemValidation,
  applyCouponValidation,
  updateShippingAddressValidation,
  updateShippingMethodValidation,
} = require("./cart.validation");
const { authMiddleware } = require("../../middleware/auth");

// Todas las rutas requieren autenticación
router.use(authMiddleware);

/**
 * Rutas básicas del carrito
 */

router.get("/", cartController.getCart);

router.post("/items", validate(addItemValidation), cartController.addToCart);

router.put(
  "/items/:productId",
  validate(updateQuantityValidation),
  cartController.updateCartItem
);

router.delete(
  "/items/:productId",
  validate(removeItemValidation),
  cartController.removeFromCart
);

router.delete("/", cartController.clearCart);

/**
 * Cupones y descuentos
 */

router.post(
  "/coupon",
  validate(applyCouponValidation),
  cartController.applyCoupon
);

/**
 * Envío y dirección
 */

router.put(
  "/shipping-address",
  validate(updateShippingAddressValidation),
  cartController.updateShippingAddress
);

router.put(
  "/shipping-method",
  validate(updateShippingMethodValidation),
  cartController.updateShippingMethod
);

module.exports = router;
