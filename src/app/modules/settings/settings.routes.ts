import { Router } from "express";

import {
  PermissionModule,
  SettingsPermission,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { upload } from "../../utils/sendImageToCloudinary";
import { settingsController } from "./settings.controller";
import { settingsValidation } from "./settings.validation";

const router = Router();

const can = (permission: SettingsPermission) =>
  checkPermission(PermissionModule.Settings, permission);

router.get("/public", settingsController.getPublicSettings);

router.post(
  "/upload",
  checkAuth,
  can(SettingsPermission.EditSettings),
  upload.single("file"),
  settingsController.uploadSettingsAsset,
);

router.get(
  "/",
  checkAuth,
  can(SettingsPermission.ViewSettings),
  settingsController.getAllSettings,
);

router.get(
  "/:group",
  checkAuth,
  can(SettingsPermission.ViewSettings),
  validateRequest(settingsValidation.groupParamValidationSchema),
  settingsController.getSettingsGroup,
);

router.patch(
  "/:group",
  checkAuth,
  can(SettingsPermission.EditSettings),
  validateRequest(settingsValidation.updateSettingsValidationSchema),
  settingsController.updateSettingsGroup,
);

router.post(
  "/:group/reset",
  checkAuth,
  can(SettingsPermission.EditSettings),
  validateRequest(settingsValidation.groupParamValidationSchema),
  settingsController.resetSettingsGroup,
);

export const settingsRoutes: Router = router;
