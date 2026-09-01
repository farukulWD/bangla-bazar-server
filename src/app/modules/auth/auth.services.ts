import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { resolveIdentifier } from "../../utils/identifier";
import { TRole } from "../roles/roles.interface";
import { UserType } from "../users/user.interface";
import { User } from "../users/user.model";
import {
  TAuthUser,
  TLoginPayload,
  TLoginResult,
  TSessionUser,
} from "./auth.interface";
import { assertTokenNotStale } from "./auth.session";
import {
  createAccessToken,
  createRefreshToken,
  toSessionUser,
  verifyRefreshToken,
} from "./auth.utils";

const deactivated = (): AppError =>
  new AppError(httpStatus.FORBIDDEN, "This account has been deactivated");

/**
 * An admin whose role was switched off keeps a valid password but loses their way in:
 * the permissions they would be handed no longer stand.
 */
const assertRoleUsable = (user: {
  userType: UserType;
  role: TRole | null;
}): void => {
  if (user.userType === UserType.Admin && user.role && !user.role.isActive) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "The role assigned to this account is inactive. Contact a superAdmin.",
    );
  }
};

const login = async (payload: TLoginPayload): Promise<TLoginResult> => {
  const lookup = resolveIdentifier(payload.identifier);
  const user = lookup
    ? await User.findOne({ ...lookup, isDeleted: { $ne: true } })
        .select("+password")
        .populate<{ role: TRole | null }>("role")
    : null;

  // One message for "no such account" and for "wrong password": telling them apart
  // turns this endpoint into a way to ask which numbers are registered.
  if (!user || !user.password) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }
  if (!(await User.isPasswordMatched(payload.password, user.password))) {
    throw new AppError(httpStatus.UNAUTHORIZED, "Invalid credentials");
  }
  if (user.status !== "active") {
    throw deactivated();
  }
  assertRoleUsable(user);

  const jwtPayload = { userId: user._id.toString(), userType: user.userType };
  return {
    token: createAccessToken(jwtPayload),
    refreshToken: createRefreshToken(jwtPayload),
    user: toSessionUser(user as unknown as TAuthUser),
  };
};

const refreshAccessToken = async (
  refreshToken: string | undefined,
): Promise<{ token: string; user: TSessionUser }> => {
  if (!refreshToken) {
    throw new AppError(httpStatus.UNAUTHORIZED, "No refresh token");
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Your session has expired. Please log in again.",
    );
  }

  // Re-read rather than trust the token: the account may have been deleted,
  // deactivated or had its password changed since it was issued.
  const user = await User.findById(payload.userId).populate<{
    role: TRole | null;
  }>("role");
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "This account no longer exists");
  }
  if (user.status !== "active") {
    throw deactivated();
  }
  assertTokenNotStale(user.passwordChangedAt, payload.iat);
  assertRoleUsable(user);

  return {
    token: createAccessToken({
      userId: user._id.toString(),
      userType: user.userType,
    }),
    user: toSessionUser(user as unknown as TAuthUser),
  };
};

const getMe = async (user: TAuthUser): Promise<TSessionUser> =>
  toSessionUser(user);

const changePassword = async (
  authUser: TAuthUser,
  currentPassword: string,
  newPassword: string,
): Promise<null> => {
  const user = await User.findOne({
    _id: authUser._id,
    isDeleted: { $ne: true },
  }).select("+password");

  if (!user || !user.password) {
    throw new AppError(httpStatus.UNAUTHORIZED, "This account no longer exists");
  }
  if (!(await User.isPasswordMatched(currentPassword, user.password))) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Your current password is not correct",
      "",
      [{ path: "currentPassword", message: "Incorrect password" }],
    );
  }
  if (await User.isPasswordMatched(newPassword, user.password)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "The new password must be different from the current one",
      "",
      [{ path: "newPassword", message: "No change" }],
    );
  }

  // Plaintext: the pre-save hook hashes it and stamps `passwordChangedAt`, which is
  // what makes every token issued before now stale.
  user.password = newPassword;
  await user.save();

  return null;
};

export const AuthServices = {
  login,
  refreshAccessToken,
  getMe,
  changePassword,
};
