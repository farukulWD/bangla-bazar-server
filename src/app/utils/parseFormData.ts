import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import AppError from "../errors/AppError";

export const parseFormData = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (typeof req.body?.data !== "string") {
    return next();
  }

  try {
    req.body = JSON.parse(req.body.data);
  } catch {
    return next(
      new AppError(
        httpStatus.BAD_REQUEST,
        "The `data` field is not valid JSON",
      ),
    );
  }

  next();
};
