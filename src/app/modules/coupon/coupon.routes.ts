import { Router } from "express";
import {
  CouponPermission,
  PermissionModule,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { parseFormData } from "../../utils/parseFormData";
import { upload } from "../../utils/sendImageToCloudinary";
import { couponController } from "./coupon.controller";
import { couponValidation } from "./coupon.validation";

const router = Router();

const can = (permission: CouponPermission) =>
  checkPermission(PermissionModule.Coupon, permission);

router.get("/showing", couponController.getShowingCoupons);
router.post(
  "/apply",
  validateRequest(couponValidation.applyCouponValidationSchema),
  couponController.applyCoupon,
);

router.get(
  "/",
  checkAuth,
  can(CouponPermission.ViewCoupons),
  couponController.getCoupons,
);

router.post(
  "/bulk",
  checkAuth,
  can(CouponPermission.AddCoupon),
  validateRequest(couponValidation.bulkCreateValidationSchema),
  couponController.bulkCreateCoupons,
);
router.patch(
  "/bulk/update",
  checkAuth,
  can(CouponPermission.EditCoupon),
  validateRequest(couponValidation.bulkUpdateValidationSchema),
  couponController.bulkUpdateCoupons,
);
router.patch(
  "/bulk/delete",
  checkAuth,
  can(CouponPermission.DeleteCoupon),
  validateRequest(couponValidation.bulkDeleteValidationSchema),
  couponController.bulkDeleteCoupons,
);

router.post(
  "/",
  checkAuth,
  can(CouponPermission.AddCoupon),
  upload.single("logo"),
  parseFormData,
  validateRequest(couponValidation.createCouponValidationSchema),
  couponController.createCoupon,
);

router.get(
  "/:id",
  checkAuth,
  can(CouponPermission.ViewCoupons),
  validateRequest(couponValidation.idParamValidationSchema),
  couponController.getCouponById,
);
router.patch(
  "/:id/status",
  checkAuth,
  can(CouponPermission.PublishCoupon),
  validateRequest(couponValidation.updateStatusValidationSchema),
  couponController.updateCouponStatus,
);
router.patch(
  "/:id",
  checkAuth,
  can(CouponPermission.EditCoupon),
  upload.single("logo"),
  parseFormData,
  validateRequest(couponValidation.updateCouponValidationSchema),
  couponController.updateCoupon,
);
router.delete(
  "/:id",
  checkAuth,
  can(CouponPermission.DeleteCoupon),
  validateRequest(couponValidation.idParamValidationSchema),
  couponController.deleteCoupon,
);

export const couponRoutes: Router = router;
