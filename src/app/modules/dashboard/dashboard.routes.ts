import { Router } from "express";

import {
  OrderPermission,
  PermissionModule,
  ProductPermission,
  UserPermission,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import { dashboardController } from "./dashboard.controller";

const router = Router();

router.get(
  "/commercial",
  checkAuth,
  checkPermission(PermissionModule.Order, OrderPermission.ViewOrders),
  dashboardController.getCommercial,
);

router.get("/operations", checkAuth, dashboardController.getOperations);

router.get(
  "/growth",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.ViewUsers),
  dashboardController.getGrowth,
);

router.get(
  "/catalog",
  checkAuth,
  checkPermission(PermissionModule.Product, ProductPermission.ViewProducts),
  dashboardController.getCatalog,
);

export const dashboardRoutes = router;
