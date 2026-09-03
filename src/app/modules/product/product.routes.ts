import { Router } from "express";
import {
  PermissionModule,
  ProductPermission,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { parseFormData } from "../../utils/parseFormData";
import { upload } from "../../utils/sendImageToCloudinary";
import { PRODUCT_IMAGES_MAX } from "./product.constant";
import { productController } from "./product.controller";
import { productValidation } from "./product.validation";

const router = Router();

const can = (permission: ProductPermission) =>
  checkPermission(PermissionModule.Product, permission);

router.get("/showing", productController.getShowingProducts);
router.get("/store", productController.getStoreProducts);
router.get("/discount", productController.getDiscountedProducts);
router.get(
  "/slug/:slug",
  validateRequest(productValidation.slugParamValidationSchema),
  productController.getProductBySlug,
);
router.get("/", productController.getProducts);

router.get(
  "/bulk/jobs/:jobId",
  checkAuth,
  can(ProductPermission.ViewProducts),
  validateRequest(productValidation.jobParamValidationSchema),
  productController.getBulkJob,
);
router.post(
  "/bulk",
  checkAuth,
  can(ProductPermission.AddProduct),
  validateRequest(productValidation.bulkCreateValidationSchema),
  productController.bulkCreateProducts,
);
router.post(
  "/bulk/export",
  checkAuth,
  can(ProductPermission.ViewProducts),
  validateRequest(productValidation.bulkExportValidationSchema),
  productController.bulkExportProducts,
);
router.patch(
  "/bulk/update",
  checkAuth,
  can(ProductPermission.EditProduct),
  validateRequest(productValidation.bulkUpdateValidationSchema),
  productController.bulkUpdateProducts,
);
router.patch(
  "/bulk/delete",
  checkAuth,
  can(ProductPermission.DeleteProduct),
  validateRequest(productValidation.bulkDeleteValidationSchema),
  productController.bulkDeleteProducts,
);

router.post(
  "/",
  checkAuth,
  can(ProductPermission.AddProduct),
  upload.array("images", PRODUCT_IMAGES_MAX),
  parseFormData,
  validateRequest(productValidation.createProductValidationSchema),
  productController.createProduct,
);

router.get(
  "/:id",
  validateRequest(productValidation.idParamValidationSchema),
  productController.getProductById,
);
router.patch(
  "/:id/status",
  checkAuth,
  can(ProductPermission.PublishProduct),
  validateRequest(productValidation.updateStatusValidationSchema),
  productController.updateProductStatus,
);
router.patch(
  "/:id",
  checkAuth,
  can(ProductPermission.EditProduct),
  upload.array("images", PRODUCT_IMAGES_MAX),
  parseFormData,
  validateRequest(productValidation.updateProductValidationSchema),
  productController.updateProduct,
);
router.delete(
  "/:id",
  checkAuth,
  can(ProductPermission.DeleteProduct),
  validateRequest(productValidation.idParamValidationSchema),
  productController.deleteProduct,
);

export const productRoutes: Router = router;
