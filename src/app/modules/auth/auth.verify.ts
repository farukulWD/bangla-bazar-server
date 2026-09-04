import httpStatus from "http-status";

import AppError from "../../errors/AppError";
import { TRole } from "../roles/roles.interface";
import "../roles/roles.model";
import { User } from "../users/user.model";
import { TAuthUser } from "./auth.interface";
import { assertTokenNotStale } from "./auth.session";
import { verifyAccessToken } from "./auth.utils";

export const authUserFromToken = async (token: string): Promise<TAuthUser> => {
  let payload;
  try {
    payload = verifyAccessToken(token);
  } catch {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Session expired or invalid. Please log in again.",
    );
  }

  const user = await User.findById(payload.userId).populate<{
    role: TRole | null;
  }>("role");

  if (!user || user.isDeleted) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "This account no longer exists",
    );
  }

  if (user.status === "inactive") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This account has been deactivated",
    );
  }

  assertTokenNotStale(user.passwordChangedAt, payload.iat);

  return user as unknown as TAuthUser;
};
