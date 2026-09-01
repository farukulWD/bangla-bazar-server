import httpStatus from "http-status";
import { permissionCatalogue } from "../../constants/permissions";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { roleServices } from "./roles.services";

const getPermissionCatalogue = catchAsync(async (_req, res) => {
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Permission catalogue retrieved successfully",
    data: permissionCatalogue(),
  });
});

const createRole = catchAsync(async (req, res) => {
  const result = await roleServices.createRole(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Role created successfully",
    data: result,
  });
});

const getRoles = catchAsync(async (req, res) => {
  const { data, pagination } = await roleServices.getRoles(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Roles retrieved successfully",
    data,
    pagination,
  });
});

const getRoleById = catchAsync(async (req, res) => {
  const result = await roleServices.getRoleById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role retrieved successfully",
    data: result,
  });
});

const updateRole = catchAsync(async (req, res) => {
  const result = await roleServices.updateRole(req.params.id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role updated successfully",
    data: result,
  });
});

const deleteRole = catchAsync(async (req, res) => {
  const result = await roleServices.deleteRole(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Role deleted successfully",
    data: result,
  });
});

export const roleControllers = {
  getPermissionCatalogue,
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
};
