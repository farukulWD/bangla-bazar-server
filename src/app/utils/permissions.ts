import {
  PERMISSION_LABELS,
  PermissionModule,
  TAnyPermission,
  TPermissionOf,
} from "../constants/permissions";
import { TAuthUser } from "../modules/auth/auth.interface";
import { UserType } from "../modules/users/user.interface";

export const holdsPermission = (
  user: TAuthUser,
  module: PermissionModule,
  permission: TAnyPermission,
): boolean => {
  if (user.userType === UserType.SuperAdmin) {
    return true;
  }
  const granted = user.role?.modules?.find((entry) => entry.module === module)
    ?.permissions?.[permission as keyof typeof PERMISSION_LABELS];
  return granted === true;
};
export const hasPermission = <M extends PermissionModule>(
  user: TAuthUser,
  module: M,
  permission: TPermissionOf<M>,
): boolean => holdsPermission(user, module, permission as TAnyPermission);
