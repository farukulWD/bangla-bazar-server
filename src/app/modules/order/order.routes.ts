import { Router } from "express";

import { OrderPermission, PermissionModule } from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { orderController } from "./order.controller";
import { orderValidation } from "./order.validation";

const router = Router();

const can = (permission: OrderPermission) =>
  checkPermission(PermissionModule.Order, permission);

router.get("/options", checkAuth, orderController.getCheckoutOptions);

// Customer surfaces. Always scoped to the caller, whoever they are — a staff
// member hitting these sees their own orders, not the store's.
router.get("/my", checkAuth, orderController.getMyOrders);
router.get("/my/stats", checkAuth, orderController.getMyOrderStats);
router.get("/my/export", checkAuth, orderController.exportMyOrders);

// Store-wide surfaces. These are the ones that can return every customer's order,
// so they are gated here rather than inside the service.
router.get(
  "/",
  checkAuth,
  can(OrderPermission.ViewOrders),
  orderController.getOrders,
);
router.get(
  "/stats",
  checkAuth,
  can(OrderPermission.ViewOrders),
  orderController.getOrderStats,
);
router.get(
  "/export",
  checkAuth,
  can(OrderPermission.ViewOrders),
  orderController.exportOrders,
);

router.post(
  "/",
  checkAuth,
  validateRequest(orderValidation.placeOrderValidationSchema),
  orderController.placeOrder,
);

// A single order is unambiguous, so this one stays dual: the owner or staff with
// ViewOrders, enforced as a condition of the query in getOrder.
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
