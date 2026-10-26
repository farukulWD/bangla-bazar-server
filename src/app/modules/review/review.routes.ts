import { Router } from "express";

import {
  PermissionModule,
  ReviewPermission,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import { publicRateLimit, userRateLimit } from "../../middleware/rateLimit";
import validateRequest from "../../middleware/validateRequest";
import { reviewController } from "./review.controller";
import { reviewValidation } from "./review.validation";

const router = Router();

const can = (permission: ReviewPermission) =>
  checkPermission(PermissionModule.Review, permission);

const reviewSubmitIpLimiter = publicRateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 60,
  message: "Too many reviews submitted. Please try again later.",
  prefix: "rl:review:submit:ip:",
});

const reviewSubmitUserLimiter = userRateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  message: "Too many reviews submitted. Please try again later.",
  prefix: "rl:review:submit:user:",
});

router.get("/my", checkAuth, reviewController.getMyReviews);

router.patch(
  "/my/:id",
  checkAuth,
  validateRequest(reviewValidation.updateMyReviewValidationSchema),
  reviewController.updateMyReview,
);

router.delete(
  "/my/:id",
  checkAuth,
  validateRequest(reviewValidation.idParamValidationSchema),
  reviewController.deleteMyReview,
);

router.get(
  "/eligibility/:productId",
  checkAuth,
  validateRequest(reviewValidation.productIdParamValidationSchema),
  reviewController.getEligibility,
);

router.post(
  "/",
  reviewSubmitIpLimiter,
  checkAuth,
  reviewSubmitUserLimiter,
  validateRequest(reviewValidation.createReviewValidationSchema),
  reviewController.createReview,
);

router.get(
  "/product/:productId",
  validateRequest(reviewValidation.productReviewsValidationSchema),
  reviewController.getProductReviews,
);

router.get(
  "/",
  checkAuth,
  can(ReviewPermission.ViewReviews),
  validateRequest(reviewValidation.reviewListValidationSchema),
  reviewController.getReviews,
);

router.patch(
  "/bulk/status",
  checkAuth,
  can(ReviewPermission.EditReview),
  validateRequest(reviewValidation.bulkStatusValidationSchema),
  reviewController.bulkUpdateReviewStatus,
);

router.post(
  "/bulk/delete",
  checkAuth,
  can(ReviewPermission.DeleteReview),
  validateRequest(reviewValidation.bulkDeleteValidationSchema),
  reviewController.bulkDeleteReviews,
);

router.get(
  "/:id",
  checkAuth,
  can(ReviewPermission.ViewReviews),
  validateRequest(reviewValidation.idParamValidationSchema),
  reviewController.getReviewById,
);

router.patch(
  "/:id/status",
  checkAuth,
  can(ReviewPermission.EditReview),
  validateRequest(reviewValidation.updateStatusValidationSchema),
  reviewController.updateReviewStatus,
);

router.patch(
  "/:id/reply",
  checkAuth,
  can(ReviewPermission.EditReview),
  validateRequest(reviewValidation.replyValidationSchema),
  reviewController.replyToReview,
);

router.delete(
  "/:id",
  checkAuth,
  can(ReviewPermission.DeleteReview),
  validateRequest(reviewValidation.idParamValidationSchema),
  reviewController.deleteReview,
);

export const reviewRoutes: Router = router;
