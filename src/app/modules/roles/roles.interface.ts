import { Types } from "mongoose";
import { PermissionModule, TAnyPermission } from "../../constants/permissions";

export type TPermissionMap = Partial<Record<TAnyPermission, boolean>>;

export type TRoleModule = {
  module: PermissionModule;
  permissions: TPermissionMap;
};

export type TRole = {
  _id: Types.ObjectId;
  name: string;
  description?: string;
  modules: TRoleModule[];
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};
