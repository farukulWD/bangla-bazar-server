import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { currencyServices } from "./currency.services";

const createCurrency = catchAsync(async (req, res) => {
  const result = await currencyServices.createCurrency(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Currency created successfully",
    data: result,
  });
});

const getCurrencies = catchAsync(async (req, res) => {
  const { data, pagination } = await currencyServices.getCurrencies(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Currencies retrieved successfully",
    data,
    pagination,
  });
});

const getActiveCurrencies = catchAsync(async (_req, res) => {
  const result = await currencyServices.getPublicCurrencies();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Active currencies retrieved successfully",
    data: result,
  });
});

const getCurrencyById = catchAsync(async (req, res) => {
  const result = await currencyServices.getCurrencyById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Currency retrieved successfully",
    data: result,
  });
});

const updateCurrency = catchAsync(async (req, res) => {
  const result = await currencyServices.updateCurrency(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Currency updated successfully",
    data: result,
  });
});

const updateCurrencyRate = catchAsync(async (req, res) => {
  const result = await currencyServices.updateCurrencyRate(
    req.params.id,
    req.body.rate,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Exchange rate updated successfully",
    data: result,
  });
});

const updateCurrencyStatus = catchAsync(async (req, res) => {
  const result = await currencyServices.updateCurrencyStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Currency ${
      req.body.status === "active" ? "activated" : "deactivated"
    } successfully`,
    data: result,
  });
});

const setBaseCurrency = catchAsync(async (req, res) => {
  const result = await currencyServices.setBaseCurrency(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.code} is now the base currency`,
    data: result,
  });
});

const deleteCurrency = catchAsync(async (req, res) => {
  const result = await currencyServices.deleteCurrency(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Currency deleted successfully",
    data: result,
  });
});

export const currencyController = {
  createCurrency,
  getCurrencies,
  getActiveCurrencies,
  getCurrencyById,
  updateCurrency,
  updateCurrencyRate,
  updateCurrencyStatus,
  setBaseCurrency,
  deleteCurrency,
};
