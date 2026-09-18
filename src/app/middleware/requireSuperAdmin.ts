import { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { UserType } from "../modules/users/user.interface";

const requireSuperAdmin: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  const user = req.user;
  if (!user) {
    return next(
      new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "requireSuperAdmin was used without checkAuth in front of it",
      ),
    );
  }
  if (user.userType !== UserType.SuperAdmin) {
    return next(
      new AppError(
        httpStatus.FORBIDDEN,
        "Only a superAdmin can change roles and permissions",
      ),
    );
  }
  next();
};
export default requireSuperAdmin;
