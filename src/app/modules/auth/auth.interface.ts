import { Types } from "mongoose";
import { UserType } from "../users/user.interface";
import { TRole } from "../roles/roles.interface";

export type TAuthUser = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  avatar?: string;
  userType: UserType;
  role: TRole | null;
  isActive: boolean;
};
