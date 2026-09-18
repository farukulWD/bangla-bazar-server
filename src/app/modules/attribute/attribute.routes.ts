import { Router } from "express";
import {
  AttributePermission,
  PermissionModule,
} from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import validateRequest from "../../middleware/validateRequest";
import { attributeController } from "./attribute.controller";
import { attributeValidation } from "./attribute.validation";

const router = Router();

const can = (permission: AttributePermission) =>
  checkPermission(PermissionModule.Attribute, permission);

router.get("/showing", attributeController.getShowingAttributes);
router.get("/", attributeController.getAttributes);

router.post(
  "/bulk",
  checkAuth,
  can(AttributePermission.AddAttribute),
  validateRequest(attributeValidation.bulkCreateValidationSchema),
  attributeController.bulkCreateAttributes,
);
router.patch(
  "/bulk/update",
  checkAuth,
  can(AttributePermission.EditAttribute),
  validateRequest(attributeValidation.bulkUpdateValidationSchema),
  attributeController.bulkUpdateAttributes,
);
router.patch(
  "/bulk/delete",
  checkAuth,
  can(AttributePermission.DeleteAttribute),
  validateRequest(attributeValidation.bulkDeleteValidationSchema),
  attributeController.bulkDeleteAttributes,
);

router.post(
  "/",
  checkAuth,
  can(AttributePermission.AddAttribute),
  validateRequest(attributeValidation.createAttributeValidationSchema),
  attributeController.createAttribute,
);

router.post(
  "/:id/values",
  checkAuth,
  can(AttributePermission.EditAttribute),
  validateRequest(attributeValidation.createValueValidationSchema),
  attributeController.addAttributeValue,
);
router.patch(
  "/:id/values/bulk/delete",
  checkAuth,
  can(AttributePermission.DeleteAttribute),
  validateRequest(attributeValidation.bulkDeleteValuesValidationSchema),
  attributeController.bulkDeleteAttributeValues,
);
router.patch(
  "/:id/values/:valueId/status",
  checkAuth,
  can(AttributePermission.PublishAttribute),
  validateRequest(attributeValidation.updateValueStatusValidationSchema),
  attributeController.updateAttributeValueStatus,
);
router.patch(
  "/:id/values/:valueId",
  checkAuth,
  can(AttributePermission.EditAttribute),
  validateRequest(attributeValidation.updateValueValidationSchema),
  attributeController.updateAttributeValue,
);
router.delete(
  "/:id/values/:valueId",
  checkAuth,
  can(AttributePermission.DeleteAttribute),
  validateRequest(attributeValidation.valueParamValidationSchema),
  attributeController.deleteAttributeValue,
);

router.get(
  "/:id",
  validateRequest(attributeValidation.idParamValidationSchema),
  attributeController.getAttributeById,
);
router.patch(
  "/:id/status",
  checkAuth,
  can(AttributePermission.PublishAttribute),
  validateRequest(attributeValidation.updateStatusValidationSchema),
  attributeController.updateAttributeStatus,
);
router.patch(
  "/:id",
  checkAuth,
  can(AttributePermission.EditAttribute),
  validateRequest(attributeValidation.updateAttributeValidationSchema),
  attributeController.updateAttribute,
);
router.delete(
  "/:id",
  checkAuth,
  can(AttributePermission.DeleteAttribute),
  validateRequest(attributeValidation.idParamValidationSchema),
  attributeController.deleteAttribute,
);

export const attributeRoutes: Router = router;
