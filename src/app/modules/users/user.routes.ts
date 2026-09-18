import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import checkPermission from "../../middleware/checkPermission";
import { PermissionModule, UserPermission } from "../../constants/permissions";
import validateRequest from "../../middleware/validateRequest";
import { upload } from "../../utils/sendImageToCloudinary";
import { UserControllers } from "./user.controller";
import {
  createStaffUserSchema,
  promoteUserSchema,
  setUserStatusSchema,
  updateMeSchema,
  updateStaffUserSchema,
} from "./user.validation";

const router = Router();

router.post(
  "/",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.AddUser),
  validateRequest(createStaffUserSchema),
  UserControllers.createStaffUser,
);

router.get(
  "/",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.ViewUsers),
  UserControllers.getUsers,
);

router.get(
  "/:id",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.ViewUsers),
  UserControllers.getUserById,
);

// The `/me` routes must stay above `/:id` — Express matches in order, and "me" is a
// valid-looking `:id` that would blow up on the ObjectId cast instead.
router.patch(
  "/me",
  checkAuth,
  validateRequest(updateMeSchema),
  UserControllers.updateMe,
);

router.patch(
  "/me/image",
  checkAuth,
  upload.single("image"),
  UserControllers.updateMyImage,
);

router.patch(
  "/:id",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.EditUser),
  validateRequest(updateStaffUserSchema),
  UserControllers.updateStaffUser,
);

router.patch(
  "/:id/promote",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.PromoteUser),
  validateRequest(promoteUserSchema),
  UserControllers.promoteUser,
);

router.patch(
  "/:id/demote",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.DemoteUser),
  UserControllers.demoteUser,
);

router.patch(
  "/:id/status",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.DeactivateUser),
  validateRequest(setUserStatusSchema),
  UserControllers.setUserStatus,
);

router.delete(
  "/:id",
  checkAuth,
  checkPermission(PermissionModule.User, UserPermission.DeleteUser),
  UserControllers.deleteUser,
);

export const userRoutes = router;
