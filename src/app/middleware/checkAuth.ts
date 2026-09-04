import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import catchAsync from "../utils/catchAsync";
import { authUserFromToken } from "../modules/auth/auth.verify";

const checkAuth = catchAsync(
  async (req: Request, _res: Response, next: NextFunction) => {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new AppError(httpStatus.UNAUTHORIZED, "Authentication required");
    }
    const token = header.slice("Bearer ".length).trim();

    req.user = await authUserFromToken(token);
    next();
  },
);
export default checkAuth;
