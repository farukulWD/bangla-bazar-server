import { HydratedDocument, Model, Types } from "mongoose";
import { USER_ROLE } from "./user.constant";

export type TUserRole = keyof typeof USER_ROLE;

export type TUserStatus = "active" | "inactive";

export enum UserType {
  Customer = "customer",
  Admin = "admin",
  SuperAdmin = "superAdmin",
}

/** The account types that can sign into the admin panel. */
export const STAFF_USER_TYPES = [UserType.Admin, UserType.SuperAdmin];

export type TCreateUser = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  userType?: UserType.Admin | UserType.SuperAdmin | UserType.Customer;
  role?: string | null;
};

export type TUpdateStaffUser = {
  name?: string;
  role?: string | null;
  status?: TUserStatus;
};

export type TSetUserStatus = {
  status: TUserStatus;
};

export type TPromoteUser = {
  role: string;
};

export type TUpdateMe = {
  name?: string;
  address?: string;
  country?: string;
  city?: string;
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

export type TUserListQuery = {
  searchTerm?: string;
  userType: UserType[];
  isActive?: boolean;
  role?: string;
  from?: Date;
  to?: Date;
  sort: string;
  page: number;
  limit: number;
};
export const USER_SORTABLE_FIELDS = ["name", "createdAt"] as const;

export type TCustomerOrderStats = {
  orderCount: number;
  totalSpent: number;
  lastOrderAt: Date | null;
};

export type TBulkResult = {
  succeeded: number;
  failed: { index: number; identifier?: string; error: string }[];
};
