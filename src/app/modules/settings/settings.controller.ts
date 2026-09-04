import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TSettingsGroup } from "./settings.interface";
import { settingsServices } from "./settings.services";

const getPublicSettings = catchAsync(async (_req, res) => {
  const result = await settingsServices.getPublicSettings();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Settings retrieved successfully",
    data: result,
  });
});

const getAllSettings = catchAsync(async (_req, res) => {
  const result = await settingsServices.getAllSettings();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Settings retrieved successfully",
    data: result,
  });
});

const getSettingsGroup = catchAsync(async (req, res) => {
  const group = req.params.group as TSettingsGroup;
  const result = await settingsServices.getSettingsGroup(group);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${group} settings retrieved successfully`,
    data: result,
  });
});

const updateSettingsGroup = catchAsync(async (req, res) => {
  const group = req.params.group as TSettingsGroup;
  const result = await settingsServices.updateSettingsGroup(group, req.body);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${group} settings updated successfully`,
    data: result,
  });
});

const resetSettingsGroup = catchAsync(async (req, res) => {
  const group = req.params.group as TSettingsGroup;
  const result = await settingsServices.resetSettingsGroup(group);
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${group} settings reset to defaults`,
    data: result,
  });
});

const uploadSettingsAsset = catchAsync(async (req, res) => {
  const result = await settingsServices.uploadSettingsAsset(req.file);
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "File uploaded successfully",
    data: result,
  });
});

export const settingsController = {
  getPublicSettings,
  getAllSettings,
  getSettingsGroup,
  updateSettingsGroup,
  resetSettingsGroup,
  uploadSettingsAsset,
};
