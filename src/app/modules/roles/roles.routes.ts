import { Router } from "express";
import { PermissionModule, RolePermission } from "../../constants/permissions";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import requireSuperAdmin from "../../middleware/requireSuperAdmin";
import validateRequest from "../../middleware/validateRequest";
import { roleControllers } from "./roles.controller";
import {
  createRoleSchema,
  idParamSchema,
  updateRoleSchema,
} from "./roles.validation";

const router = Router();

const can = (permission: RolePermission) =>
  checkPermission(PermissionModule.Role, permission);

/**
 * The catalogue is open to any signed-in staff member: the role editor needs the
 * module and permission labels before it can render a form. It is declared above
 * `/:id`, which would otherwise swallow "permissions" as an id.
 */
router.get("/permissions", checkAuth, roleControllers.getPermissionCatalogue);

router.post(
  "/",
  checkAuth,
  requireSuperAdmin,
  can(RolePermission.AddRole),
  validateRequest(createRoleSchema),
  roleControllers.createRole,
);

router.get(
  "/",
  checkAuth,
  can(RolePermission.ViewRoles),
  roleControllers.getRoles,
);

router.get(
  "/:id",
  checkAuth,
  can(RolePermission.ViewRoles),
  validateRequest(idParamSchema),
  roleControllers.getRoleById,
);

router.patch(
  "/:id",
  checkAuth,
  requireSuperAdmin,
  can(RolePermission.EditRole),
  validateRequest(updateRoleSchema),
  roleControllers.updateRole,
);

router.delete(
  "/:id",
  checkAuth,
  requireSuperAdmin,
  can(RolePermission.DeleteRole),
  validateRequest(idParamSchema),
  roleControllers.deleteRole,
);

export const roleRoutes: Router = router;
