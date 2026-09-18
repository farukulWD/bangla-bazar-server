import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { cartServices } from "./cart.services";

const getCart = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await cartServices.getCart(owner._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart fetched successfully",
    data: result,
  });
});

const setCartItem = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await cartServices.setItem(owner._id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart updated successfully",
    data: result,
  });
});

const removeCartItem = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await cartServices.removeItem(owner._id, req.params.lineId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart updated successfully",
    data: result,
  });
});

const clearCart = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await cartServices.clearCart(owner._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart emptied successfully",
    data: result,
  });
});

const mergeCart = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await cartServices.mergeCart(owner._id, req.body.lines);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Cart merged successfully",
    data: result,
  });
});

export const cartController = {
  getCart,
  setCartItem,
  removeCartItem,
  clearCart,
  mergeCart,
};
