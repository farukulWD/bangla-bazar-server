import { NextFunction, Request, Response } from "express";

import catchAsync from "../utils/catchAsync";
import { ZodObject } from "zod";

const validateRequest = (schema: ZodObject) => {
  return catchAsync(async (req: Request, res: Response, next: NextFunction) => {
    await schema.parseAsync({
      body: req.body,
      cookies: req.cookies,
      params: req.params,
      query: req.query,
    });

    next();
  });
};

export default validateRequest;
