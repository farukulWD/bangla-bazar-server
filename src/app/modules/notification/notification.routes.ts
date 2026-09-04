import { Router } from "express";

import checkAuth from "../../middleware/checkAuth";
import validateRequest from "../../middleware/validateRequest";
import { notificationController } from "./notification.controller";
import { notificationValidation } from "./notification.validation";

const router = Router();

router.get("/", checkAuth, notificationController.getNotifications);
router.get("/unread-count", checkAuth, notificationController.getUnreadCount);

router.patch("/read-all", checkAuth, notificationController.markAllRead);

router.patch(
  "/:id/read",
  checkAuth,
  validateRequest(notificationValidation.idParamValidationSchema),
  notificationController.markRead,
);

export const notificationRoutes: Router = router;
