import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { notificationServices } from "./notification.services";

const getNotifications = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const { data, pagination } = await notificationServices.listNotifications(
    caller,
    req.query,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications fetched successfully",
    data,
    pagination,
  });
});

const getUnreadCount = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await notificationServices.getUnreadCount(caller, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Unread notification count fetched successfully",
    data: result,
  });
});

const markRead = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await notificationServices.markRead(caller, req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notification marked as read",
    data: result,
  });
});

const markAllRead = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await notificationServices.markAllRead(caller, req.query);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Notifications marked as read",
    data: result,
  });
});

export const notificationController = {
  getNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
