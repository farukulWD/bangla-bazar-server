import { CookieOptions } from "express";
import jwt, { SignOptions } from "jsonwebtoken";
import { Types } from "mongoose";
import config from "../../config";
import { TRole } from "../roles/roles.interface";
import { TUserStatus, UserType } from "../users/user.interface";
import { TJwtPayload, TSessionUser } from "./auth.interface";

export const REFRESH_COOKIE_NAME = "bb_refresh_token";

/**
 * Read through a guard rather than straight off config: an unset secret otherwise
 * surfaces as `secretOrPrivateKey must have a value` from deep inside a request that
 * has already done its work — during registration that meant a 500 *after* the
 * account was created.
 */
const getAccessSecret = (): string => {
  if (!config.jwt_access_secret) {
    throw new Error("JWT_SECRET is not set");
  }
  return config.jwt_access_secret;
};

const getRefreshSecret = (): string => {
  if (!config.jwt_refresh_secret) {
    throw new Error("JWT_REFRESH_SECRET is not set");
  }
  // Sharing one secret would let an access token be replayed as a refresh token.
  if (config.jwt_refresh_secret === config.jwt_access_secret) {
    throw new Error("JWT_REFRESH_SECRET must differ from JWT_SECRET");
  }
  return config.jwt_refresh_secret;
};

const sign = (
  payload: TJwtPayload,
  secret: string,
  expiresIn: string,
): string =>
  jwt.sign({ userId: payload.userId, userType: payload.userType }, secret, {
    expiresIn,
  } as SignOptions);

export const createAccessToken = (payload: TJwtPayload): string =>
  sign(payload, getAccessSecret(), config.jwt_access_expiration);

export const createRefreshToken = (payload: TJwtPayload): string =>
  sign(payload, getRefreshSecret(), config.jwt_refresh_expiration);

export const verifyAccessToken = (token: string): TJwtPayload =>
  jwt.verify(token, getAccessSecret()) as TJwtPayload;

export const verifyRefreshToken = (token: string): TJwtPayload =>
  jwt.verify(token, getRefreshSecret()) as TJwtPayload;

export const refreshCookieOptions = (): CookieOptions => {
  const isProduction = config.node_environment === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? "none" : "lax",
    // Scoped to the auth routes: no other endpoint has any use for it.
    path: "/api/v1/auth",
    maxAge: config.refresh_cookie_max_age_ms,
  };
};

export const clearRefreshCookieOptions = (): CookieOptions => {
  const { maxAge: _maxAge, ...rest } = refreshCookieOptions();
  return rest;
};

/** `{ user: { can_view_users: true, … }, … }` — what the admin client checks against. */
const flattenPermissions = (
  role: TRole | null,
): Record<string, Record<string, boolean>> => {
  if (!role) {
    return {};
  }
  return role.modules.reduce<Record<string, Record<string, boolean>>>(
    (acc, entry) => {
      acc[entry.module] = { ...entry.permissions } as Record<string, boolean>;
      return acc;
    },
    {},
  );
};

type TSessionSource = {
  _id: Types.ObjectId;
  name: string;
  email?: string;
  phone?: string;
  image?: string;
  userType: UserType;
  status: TUserStatus;
  isEmailVerify?: boolean;
  isPhoneVerify?: boolean;
  role?: TRole | null;
};

/**
 * The shape the client gets. `status` and not an `isActive` — the user schema has no
 * such field.
 */
export const toSessionUser = (user: TSessionSource): TSessionUser => ({
  _id: user._id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  image: user.image,
  userType: user.userType,
  status: user.status,
  isEmailVerify: user.isEmailVerify ?? false,
  isPhoneVerify: user.isPhoneVerify ?? false,
  role: user.role ? { _id: user.role._id, name: user.role.name } : null,
  permissions: flattenPermissions(user.role ?? null),
});
