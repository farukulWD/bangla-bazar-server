import { Router } from "express";
import {
  CategoryPermission,
  PermissionModule,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { upload } from "../../utils/sendImageToCloudinary";
import { categoryController } from "./category.controller";
import { parseFormData } from "./category.utils";
import { categoryValidation } from "./category.validation";

const router = Router();

const can = (permission: CategoryPermission) =>
  checkPermission(PermissionModule.Category, permission);

/**
 * The literal paths are declared before `/:id`, which would otherwise swallow
 * them as an id.
 */
router.get("/tree", categoryController.getCategoryTree);
router.get("/tree/showing", categoryController.getShowingCategoryTree);
router.get("/", categoryController.getCategories);

router.post(
  "/bulk",
  checkAuth,
  can(CategoryPermission.AddCategory),
  validateRequest(categoryValidation.bulkCreateValidationSchema),
  categoryController.bulkCreateCategories,
);
router.patch(
  "/bulk/update",
  checkAuth,
  can(CategoryPermission.EditCategory),
  validateRequest(categoryValidation.bulkUpdateValidationSchema),
  categoryController.bulkUpdateCategories,
);
router.patch(
  "/bulk/delete",
  checkAuth,
  can(CategoryPermission.DeleteCategory),
  validateRequest(categoryValidation.bulkDeleteValidationSchema),
  categoryController.bulkDeleteCategories,
);

router.post(
  "/",
  checkAuth,
  can(CategoryPermission.AddCategory),
  upload.single("icon"),
  parseFormData,
  validateRequest(categoryValidation.createCategoryValidationSchema),
  categoryController.createCategory,
);

router.get(
  "/:id",
  validateRequest(categoryValidation.idParamValidationSchema),
  categoryController.getCategoryById,
);
router.patch(
  "/:id/status",
  checkAuth,
  can(CategoryPermission.PublishCategory),
  validateRequest(categoryValidation.updateStatusValidationSchema),
  categoryController.updateCategoryStatus,
);
router.patch(
  "/:id",
  checkAuth,
  can(CategoryPermission.EditCategory),
  upload.single("icon"),
  parseFormData,
  validateRequest(categoryValidation.updateCategoryValidationSchema),
  categoryController.updateCategory,
);
router.delete(
  "/:id",
  checkAuth,
  can(CategoryPermission.DeleteCategory),
  validateRequest(categoryValidation.idParamValidationSchema),
  categoryController.deleteCategory,
);

export const categoryRoutes: Router = router;
