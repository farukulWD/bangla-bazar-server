import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
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

export const userController = {
  createStaffUser,
};
