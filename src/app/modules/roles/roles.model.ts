import { Schema, model } from "mongoose";
import { PermissionModule } from "../../constants/permissions";
import { TRole, TRoleModule } from "./roles.interface";

const roleModuleSchema = new Schema<TRoleModule>(
  {
    module: {
      type: String,
      enum: Object.values(PermissionModule),
      required: true,
    },
    permissions: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  { _id: false },
);
const roleSchema = new Schema<TRole>(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    modules: {
      type: [roleModuleSchema],
      default: [],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);
export const Role = model<TRole>("Role", roleSchema);
