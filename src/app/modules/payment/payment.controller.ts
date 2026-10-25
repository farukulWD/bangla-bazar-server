import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { TPaymentCallbackSource } from "./payment.interface";
import { paymentServices } from "./payment.services";
import {
  callbackParams,
  clientIp,
  clientReturnUrl,
  toMyPaymentView,
  toPaymentView,
} from "./payment.utils";

const initPayment = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await paymentServices.initPayment(caller, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Payment session created successfully",
    data: result,
  });
});

const redirectCallback = (source: Exclude<TPaymentCallbackSource, "ipn">) =>
  catchAsync(async (req, res) => {
    const outcome = await paymentServices.settleFromCallback(
      callbackParams(req),
      source,
      clientIp(req),
    );

    res.redirect(httpStatus.FOUND, clientReturnUrl(outcome));
  });

const handleIpn = catchAsync(async (req, res) => {
  const outcome = await paymentServices.settleFromCallback(
    callbackParams(req),
    "ipn",
    clientIp(req),
  );

  res
    .status(
      outcome.retryable ? httpStatus.INTERNAL_SERVER_ERROR : httpStatus.OK,
    )
    .type("text/plain")
    .send(outcome.state);
});

const getMyPayments = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const { data, pagination } = await paymentServices.getMyPayments(
    caller,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments fetched successfully",
    data: data.map(toMyPaymentView),
    pagination,
  });
});

const getMyPaymentForOrder = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await paymentServices.getMyPaymentForOrder(
    caller,
    req.params.orderId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data: toMyPaymentView(result),
  });
});

const listPayments = catchAsync(async (req, res) => {
  const { data, pagination } = await paymentServices.listPayments(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payments fetched successfully",
    data: data.map(toPaymentView),
    pagination,
  });
});

const getPaymentById = catchAsync(async (req, res) => {
  const result = await paymentServices.getPayment(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Payment fetched successfully",
    data: result,
  });
});

export const paymentController = {
  initPayment,
  handleSuccess: redirectCallback("success"),
  handleFail: redirectCallback("fail"),
  handleCancel: redirectCallback("cancel"),
  handleIpn,
  getMyPayments,
  getMyPaymentForOrder,
  listPayments,
  getPaymentById,
};
