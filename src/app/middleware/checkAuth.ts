import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import catchAsync from "../utils/catchAsync";
import { TAuthUser } from "../modules/auth/auth.interface";
import { assertTokenNotStale } from "../modules/auth/auth.session";
import varifyToken from "../utils/verifyToken";
import { TRole } from "../modules/roles/roles.interface";
import { User } from "../modules/users/user.model";

const checkAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
    }
    const token = header.slice("Bearer ".length).trim();

    let payload;
    try {
      payload = varifyToken(token);
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
    req.user = user as unknown as TAuthUser;
    next();
  },
);
export default checkAuth;
