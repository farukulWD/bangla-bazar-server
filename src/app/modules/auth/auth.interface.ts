import { Types } from "mongoose";
import { TUserStatus, UserType } from "../users/user.interface";
import { TRole } from "../roles/roles.interface";

/** What `checkAuth` puts on `req.user`: the user document with `role` populated. */
export type TAuthUser = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  userType: UserType;
  role: TRole | null;
  status: TUserStatus;
  isEmailVerify?: boolean;
  isPhoneVerify?: boolean;
  passwordChangedAt?: Date;
  isDeleted?: boolean;
};

export type TJwtPayload = {
  userId: string;
  userType: UserType;
  /** Added by `jwt.sign`, in seconds. Compared against `passwordChangedAt` — see auth.session.ts. */
  iat?: number;
};

export type TRegisterPayload = {
  name: string;
  phone?: string;
  email?: string;
  password: string;
};

export type TPendingRegistration = {
  name: string;
  email?: string;
  phone?: string;
  passwordHash: string;
};

export type TOtpRecord = {
  codeHash: string;
  attempts: number;
  /** Attempts exhausted. The key stays until it expires, so the cooldown outlives the dead code. */
  burned?: boolean;
};

/** Email wins when both are given — see auth.registration.service.ts. */
export type TRegisterChannel = "email" | "sms";

export type TOtpChallenge = {
  /** Normalised email or E.164 phone. The Redis key, and what the client echoes back. */
  identifier: string;
  channel: TRegisterChannel;
  /** Masked address or number, for UI copy — never the full value. */
  targetMasked: string;
  expiresInSeconds: number;
  resendAfterSeconds: number;
  devCode?: string;
};

/** Adds the account's masked number: an email identifier must not hand back its owner's phone. */
export type TPasswordResetChallenge = TOtpChallenge & {
  phoneMasked: string;
};

export type TResetTokenResult = {
  resetToken: string;
  expiresInSeconds: number;
};

export type TLoginPayload = {
  identifier: string;
  password: string;
};

export type TSessionUser = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  userType: UserType;
  status: TUserStatus;
  isEmailVerify: boolean;
  isPhoneVerify: boolean;
  role: { _id: Types.ObjectId; name: string } | null;
  /** Flattened from the role, so the client does not have to walk `modules`. */
  permissions: Record<string, Record<string, boolean>>;
};

export type TLoginResult = {
  token: string;
  refreshToken: string;
  user: TSessionUser;
};

/** Registration ends in a session too, so it returns the same thing a login does. */
export type TRegisterResult = TLoginResult;
