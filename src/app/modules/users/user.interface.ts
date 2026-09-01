import { HydratedDocument, Model, Types } from "mongoose";
import { USER_ROLE } from "./user.constant";

export type TUserRole = keyof typeof USER_ROLE;

export type TUserStatus = "active" | "inactive";

export enum UserType {
  Customer = "customer",
  Admin = "admin",
  SuperAdmin = "superAdmin",
}

export type TCreateUser = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  userType?: UserType.Admin | UserType.SuperAdmin | UserType.Customer;
  role?: string | null;
};

export type TUser = {
  name: string;
  email?: string;
  phone?: string;
  // Ref to the Role collection; populated as TRole by checkAuth.
  role: Types.ObjectId | null;
  userType: UserType;
  password?: string;
  status: TUserStatus;
  image?: string;
  address?: string;
  country?: string;
  city?: string;
  // TODO: Should be separate collection
  shippingAddress?: Record<string, unknown>;
  isDeleted: boolean;
  isPhoneVerify: boolean;
  isEmailVerify: boolean;
  passwordChangedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type TUserDocument = HydratedDocument<TUser>;

export interface UserModel extends Model<TUser> {
  userFindByPhone(payload: string): Promise<TUserDocument | null>;
  isPasswordMatched(
    plainTextPassword: string,
    hashedPassword: string,
  ): Promise<boolean>;
  isJWTIssuedBeforePasswordChanged(
    passwordChangedTimestamp: Date,
    jwtIssuedTimestamp: number,
  ): boolean;
}
