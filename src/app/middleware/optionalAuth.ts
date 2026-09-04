import { NextFunction, Request, Response } from "express";
import { TAuthUser } from "../modules/auth/auth.interface";
import { authUserFromToken } from "../modules/auth/auth.verify";

import catchAsync from "../utils/catchAsync";

const optionalAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      return next();
    }
    const token = header.slice("Bearer ".length).trim();

    try {
      req.user = await authUserFromToken(token);
    } catch {
      // Every rejection an authenticated route would raise — expired, deleted,
      // deactivated, stale — just means anonymous here.
    }

    next();
  },
);
export const optionalUser = (req: Request): TAuthUser | undefined =>
  req.user as TAuthUser | undefined;

export default optionalAuth;
