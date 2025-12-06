const express = require("express");
const router = express.Router();
const categoryController = require("./category.controller");
const {
  validate,
  createCategoryValidation,
  updateCategoryValidation,
  slugValidation,
  idValidation,
} = require("./category.validation");
const { authMiddleware, requireRole } = require("../../middleware/auth");

/**
 * RUTAS PÚBLICAS
 */

router.get("/", categoryController.getCategories);
router.get("/tree", categoryController.getCategoryTree);
router.get("/featured", categoryController.getFeaturedCategories);
router.get("/popular", categoryController.getPopularCategories);
router.get("/search", categoryController.searchCategories);
router.get(
  "/:slug",
  validate(slugValidation),
  categoryController.getCategoryBySlug
);

/**
 * RUTAS PROTEGIDAS - ADMIN
 */

router.post(
  "/",
  authMiddleware,
  requireRole("admin"),
  validate(createCategoryValidation),
  categoryController.createCategory
);

router.put(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate(updateCategoryValidation),
  categoryController.updateCategory
);

router.delete(
  "/:id",
  authMiddleware,
  requireRole("admin"),
  validate(idValidation),
  categoryController.deleteCategory
);

module.exports = router;
