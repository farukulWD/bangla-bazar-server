import { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";
import {
  PERMISSION_LABELS,
  PermissionModule,
  TPermissionOf,
} from "../constants/permissions";
import AppError from "../errors/AppError";
import { hasPermission } from "../utils/permissions";

const checkPermission =
  <M extends PermissionModule>(
    module: M,
    permission: TPermissionOf<M>,
  ): RequestHandler =>
  (req: Request, _res: Response, next: NextFunction) => {
    const user = req.user;

    if (!user) {
      return next(
        new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "checkPermission was used without checkAuth in front of it",
        ),
      );
    }

    if (!hasPermission(user, module, permission)) {
      const label =
        PERMISSION_LABELS[permission as keyof typeof PERMISSION_LABELS] ??
        permission;
      return next(
        new AppError(
          httpStatus.FORBIDDEN,
          `You do not have permission to: ${label}`,
        ),
      );
    }

    next();
  };

export default checkPermission;
