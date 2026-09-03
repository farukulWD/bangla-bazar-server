import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { addressServices } from "./address.services";

const getMyAddresses = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await addressServices.listAddresses(owner._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Addresses fetched successfully",
    data: result,
  });
});

const createAddress = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await addressServices.createAddress(owner._id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Address added successfully",
    data: result,
  });
});

const updateAddress = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await addressServices.updateAddress(
    owner._id,
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Address updated successfully",
    data: result,
  });
});

const deleteAddress = catchAsync(async (req, res) => {
  const owner = req.user as TAuthUser;
  const result = await addressServices.deleteAddress(owner._id, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Address deleted successfully",
    data: result,
  });
});

export const addressController = {
  getMyAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
};
