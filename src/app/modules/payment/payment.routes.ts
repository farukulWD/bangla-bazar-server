import express, { Router } from "express";

import config from "../../config";
import { OrderPermission, PermissionModule } from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import { userRateLimit } from "../../middleware/rateLimit";
import validateRequest from "../../middleware/validateRequest";
import { logger } from "../../shared/logger";
import { paymentController } from "./payment.controller";
import { ipnAllowlist } from "./payment.utils";
import { paymentValidation } from "./payment.validation";

const router = Router();

const formBody = express.urlencoded({ extended: false, limit: "64kb" });

const can = (permission: OrderPermission) =>
  checkPermission(PermissionModule.Order, permission);

const initLimiter = userRateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  message: "Too many payment attempts. Please try again shortly.",
  prefix: "rl:pay:init:",
});

if (config.ssl_ipn_allow_any_ip && config.node_environment === "production") {
  logger.warn(
    "SSL_IPN_ALLOW_ANY_IP is on in production: the IPN endpoint accepts any source address.",
  );
}

router.post(
  "/init",
  checkAuth,
  initLimiter,
  validateRequest(paymentValidation.initPaymentValidationSchema),
  paymentController.initPayment,
);

router
  .route("/sslcommerz/success")
  .post(formBody, paymentController.handleSuccess)
  .get(formBody, paymentController.handleSuccess);

router
  .route("/sslcommerz/fail")
  .post(formBody, paymentController.handleFail)
  .get(formBody, paymentController.handleFail);

router
  .route("/sslcommerz/cancel")
  .post(formBody, paymentController.handleCancel)
  .get(formBody, paymentController.handleCancel);

router.post(
  "/sslcommerz/ipn",
  formBody,
  ipnAllowlist,
  paymentController.handleIpn,
);

router.get("/my", checkAuth, paymentController.getMyPayments);

router.get(
  "/my/:orderId",
  checkAuth,
  validateRequest(paymentValidation.orderIdParamValidationSchema),
  paymentController.getMyPaymentForOrder,
);

router.get(
  "/",
  checkAuth,
  can(OrderPermission.ViewOrders),
  paymentController.listPayments,
);

router.get(
  "/:id",
  checkAuth,
  can(OrderPermission.ViewOrders),
  validateRequest(paymentValidation.idParamValidationSchema),
  paymentController.getPaymentById,
);

export const paymentRoutes: Router = router;
