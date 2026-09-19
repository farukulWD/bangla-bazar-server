import { Router } from "express";

import {
  ContactPermission,
  PermissionModule,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import optionalAuth from "../../middleware/optionalAuth";
import { publicRateLimit } from "../../middleware/rateLimit";
import validateRequest from "../../middleware/validateRequest";
import { contactController } from "./contact.controller";
import { contactValidation } from "./contact.validation";

const router = Router();

const HOUR = 60 * 60 * 1000;

const submitLimiter = publicRateLimit({
  windowMs: HOUR,
  limit: 5,
  message: "Too many messages sent. Please try again later.",
  prefix: "rl:contact:submit:",
});

const can = (permission: ContactPermission) =>
  checkPermission(PermissionModule.Contact, permission);

router.post(
  "/",
  submitLimiter,
  optionalAuth,
  validateRequest(contactValidation.createContactValidationSchema),
  contactController.createContact,
);

router.get(
  "/",
  checkAuth,
  can(ContactPermission.ViewContacts),
  contactController.getContacts,
);

router.get(
  "/:id",
  checkAuth,
  can(ContactPermission.ViewContacts),
  validateRequest(contactValidation.idParamValidationSchema),
  contactController.getContactById,
);

router.patch(
  "/:id/status",
  checkAuth,
  can(ContactPermission.UpdateContactStatus),
  validateRequest(contactValidation.updateStatusValidationSchema),
  contactController.updateContactStatus,
);

router.delete(
  "/:id",
  checkAuth,
  can(ContactPermission.DeleteContact),
  validateRequest(contactValidation.idParamValidationSchema),
  contactController.deleteContact,
);

export const contactRoutes: Router = router;
