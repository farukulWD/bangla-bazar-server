import { NextFunction, Request, Response } from "express";
import { TAuthUser } from "../modules/auth/auth.interface";
import { isTokenStale } from "../modules/auth/auth.session";
import { TRole } from "../modules/roles/roles.interface";

import catchAsync from "../utils/catchAsync";
import { verifyAccessToken } from "../modules/auth/auth.utils";
import { User } from "../modules/users/user.model";

const optionalAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next();
    }
    const token = header.slice("Bearer ".length).trim();
    let payload;
    try {
      payload = verifyAccessToken(token);
    } catch {
      return next();
    }
    const user = await User.findById(payload.userId).populate<{
      role: TRole | null;
    }>("role");

    if (!user || user.isDeleted || user.status === "inactive") {
      return next();
    }
    if (isTokenStale(user.passwordChangedAt, payload.iat)) {
      return next();
    }
    req.user = user as unknown as TAuthUser;
    next();
  },
);
export const optionalUser = (req: Request): TAuthUser | undefined =>
  req.user as TAuthUser | undefined;

export default optionalAuth;
