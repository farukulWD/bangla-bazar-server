import z, { ZodError } from "zod";
import {
  TErrorSourse,
  TGenericErrorResponse,
} from "../interface/error.interface";
import config from "../config";

export const handleZodError = (err: ZodError): TGenericErrorResponse => {
  const errorSources: TErrorSourse = err.issues.map(
    (issue: z.core.$ZodIssue) => ({
      path: String(issue.path[issue.path.length - 1] ?? ""),
      message: issue.message,
    }),
  );

  return {
    success: false,
    statusCode: 400,
    message: "Data validation error",
    errorSources,
    stack: config.node_environment === "development" ? err?.stack : null,
  };
};
