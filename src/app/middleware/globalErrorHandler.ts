import { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { TErrorSourse } from "../interface/error.interface";
import { handleZodError } from "../errors/handleZodError";
import { handleCastError } from "../errors/handleCastError";
import handleDuplicateError from "../errors/handleDuplicateError";
import AppError from "../errors/AppError";
import config from "../config";
import mongoose from "mongoose";
import { handleValidationError } from "../errors/handleValidationError";

export const globalErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const message = err.message || "Something went wrong";
  const statusCode = err.statusCode || 500;
  console.log(err)
  const errorSources: TErrorSourse = [
    {
      path: "",
      message: "Something went wrong",
    },
  ];
  if (err instanceof ZodError) {
    const simplifiedError = handleZodError(err);
    return res.status(simplifiedError.statusCode).json(simplifiedError);
  }
  if (err?.name === "CastError") {
    const simplifiedError = handleCastError(err);
    return res.status(simplifiedError.statusCode).json(simplifiedError);
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const simplifiedError = handleValidationError(err)
    return res.status(simplifiedError.statusCode).json(simplifiedError);
  }
  if (err.code === 11000) {
    const simplifiedError = handleDuplicateError(err);
    return res.status(simplifiedError.statusCode).json(simplifiedError);
  }
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      success: false,
      statusCode: err.statusCode,
      message: err.message,
      errorSources: err.errorSources?.length
        ? err.errorSources
        : [
          {
            path: "",
            message: err.message,
          }
        ],
      stack: config.node_environment === "development" ? err?.stack : null,
    });
  }
  if (err instanceof Error) {
    return res.status(statusCode).json({
      success: false,
      statusCode: statusCode,
      message: err.message,
      errorSources: [
        {
          path: "",
          message: err.message,
        }
      ],
      stack: config.node_environment === "development" ? err?.stack : null,
    });
  }
  return res.status(statusCode).json({
    statusCode,
    success: false,
    message,
    errorSources,
    err,
  });
};
