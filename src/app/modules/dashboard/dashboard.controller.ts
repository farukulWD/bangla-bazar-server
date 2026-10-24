import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { dashboardServices } from "./dashboard.services";
import { rangeQuerySchema } from "./dashboard.validation";

const getCommercial = catchAsync(async (req, res) => {
  const { from, to } = rangeQuerySchema.parse(req.query);
  const result = await dashboardServices.getCommercial(from, to);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Commercial metrics fetched successfully",
    data: result,
  });
});

const getOperations = catchAsync(async (req, res) => {
  const result = await dashboardServices.getOperations(req.user as TAuthUser);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Operations queue fetched successfully",
    data: result,
  });
});

const getGrowth = catchAsync(async (req, res) => {
  const { from, to } = rangeQuerySchema.parse(req.query);
  const result = await dashboardServices.getGrowth(from, to);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Growth metrics fetched successfully",
    data: result,
  });
});

const getCatalog = catchAsync(async (_req, res) => {
  const result = await dashboardServices.getCatalog();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Catalog health fetched successfully",
    data: result,
  });
});

export const dashboardController = {
  getCommercial,
  getOperations,
  getGrowth,
  getCatalog,
};
