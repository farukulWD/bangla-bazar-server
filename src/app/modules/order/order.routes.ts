import { Router } from "express";

import { OrderPermission, PermissionModule } from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { orderController } from "./order.controller";
import { orderValidation } from "./order.validation";

const router = Router();
// TODO: Add permission checks for all routes that require them

const can = (permission: OrderPermission) =>
  checkPermission(PermissionModule.Order, permission);

router.get("/options", checkAuth, orderController.getCheckoutOptions);
router.get("/stats", checkAuth, orderController.getOrderStats);

router.get("/", checkAuth, orderController.getOrders);

router.get("/export", checkAuth, orderController.exportOrders);

router.post(
  "/",
  checkAuth,
  validateRequest(orderValidation.placeOrderValidationSchema),
  orderController.placeOrder,
);

router.get(
  "/:id",
  checkAuth,
  validateRequest(orderValidation.idParamValidationSchema),
  orderController.getOrderById,
);

router.get(
  "/:id/invoice",
  checkAuth,
  validateRequest(orderValidation.idParamValidationSchema),
  orderController.getOrderInvoice,
);

router.post(
  "/:id/cancel",
  checkAuth,
  validateRequest(orderValidation.idParamValidationSchema),
  orderController.cancelOrder,
);

router.patch(
  "/:id/status",
  checkAuth,
  can(OrderPermission.UpdateOrderStatus),
  validateRequest(orderValidation.updateStatusValidationSchema),
  orderController.updateOrderStatus,
);

router.patch(
  "/:id/payment",
  checkAuth,
  can(OrderPermission.UpdatePaymentStatus),
  validateRequest(orderValidation.updatePaymentStatusValidationSchema),
  orderController.updatePaymentStatus,
);

export const orderRoutes: Router = router;
