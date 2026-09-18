import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { userServices } from "./user.services";
import httpStatus from "http-status";

const createStaffUser = catchAsync(async (req, res) => {
  const result = await userServices.createStaffUser(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Staff user created successfully",
    data: result,
  });
});

const getUsers = catchAsync(async (req, res) => {
  const result = await userServices.getUsers(req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Users fetched successfully",
    data: result.data,
    pagination: result.pagination,
  });
});

const getUserById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const result = await userServices.getUserById(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User fetched successfully",
    data: result,
  });
});

const updateStaffUser = catchAsync(async (req, res) => {
  const result = await userServices.updateStaffUser(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User updated successfully",
    data: result,
  });
});

const promoteUser = catchAsync(async (req, res) => {
  const actor = req.user as TAuthUser;
  const result = await userServices.promoteUser(
    req.params.id,
    req.body.role,
    actor._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User promoted to admin successfully",
    data: result,
  });
});

const demoteUser = catchAsync(async (req, res) => {
  const actor = req.user as TAuthUser;
  const result = await userServices.demoteUser(req.params.id, actor._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Admin demoted to customer successfully",
    data: result,
  });
});

const setUserStatus = catchAsync(async (req, res) => {
  const actor = req.user as TAuthUser;
  const { status } = req.body;
  const result = await userServices.setUserStatus(
    req.params.id,
    status,
    actor._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message:
      status === "active"
        ? "Account activated successfully"
        : "Account deactivated successfully",
    data: result,
  });
});

const deleteUser = catchAsync(async (req, res) => {
  const actor = req.user as TAuthUser;
  const result = await userServices.softDeleteUser(req.params.id, actor._id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "User deleted successfully",
    data: result,
  });
});

const updateMe = catchAsync(async (req, res) => {
  const result = await userServices.updateMe(req.user as TAuthUser, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile updated successfully",
    data: result,
  });
});

const updateMyImage = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError(httpStatus.BAD_REQUEST, "An image file is required");
  }

  const result = await userServices.updateMyImage(
    req.user as TAuthUser,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Profile photo updated successfully",
    data: result,
  });
});

export const UserControllers = {
  createStaffUser,
  getUsers,
  getUserById,
  updateStaffUser,
  promoteUser,
  demoteUser,
  setUserStatus,
  deleteUser,
  updateMe,
  updateMyImage,
};
