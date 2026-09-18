import { Response } from "express";
import { TPagination } from "../interface/common";

type TResponseData<T> = {
  data: T;
  success?: boolean;
  statusCode: number;
  message?: string;
  pagination?: TPagination;
};

const sendResponse = <T>(res: Response, data: TResponseData<T>) => {
  res.status(data.statusCode).json({
    statusCode: data.statusCode,
    success: data.success,
    message: data.message,
    data: data.data,
    // Omitted rather than defaulted: a non-list response has no pagination, and an
    // empty array is the wrong shape for a field typed as TPagination.
    ...(data.pagination ? { pagination: data.pagination } : {}),
  });
};

export default sendResponse;
