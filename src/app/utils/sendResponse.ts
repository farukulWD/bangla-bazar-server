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
    pagination: data.pagination || [],
  });
};

export default sendResponse;
