import httpStatus from "http-status";

import { optionalUser } from "../../middleware/optionalAuth";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { contactServices } from "./contact.services";

const createContact = catchAsync(async (req, res) => {
  const result = await contactServices.createContact(
    req.body,
    optionalUser(req)?._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Message sent successfully",
    data: result,
  });
});

const getContacts = catchAsync(async (req, res) => {
  const { data, pagination } = await contactServices.getContacts(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Messages retrieved successfully",
    data,
    pagination,
  });
});

const getContactById = catchAsync(async (req, res) => {
  const result = await contactServices.getContactById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message retrieved successfully",
    data: result,
  });
});

const updateContactStatus = catchAsync(async (req, res) => {
  const result = await contactServices.updateContactStatus(
    req.params.id as string,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message status updated successfully",
    data: result,
  });
});

const deleteContact = catchAsync(async (req, res) => {
  const result = await contactServices.deleteContact(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Message deleted successfully",
    data: result,
  });
});

export const contactController = {
  createContact,
  getContacts,
  getContactById,
  updateContactStatus,
  deleteContact,
};
