import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { attributeServices } from "./attribute.services";

const createAttribute = catchAsync(async (req, res) => {
  const result = await attributeServices.createAttribute(req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attribute created successfully",
    data: result,
  });
});

const bulkCreateAttributes = catchAsync(async (req, res) => {
  const result = await attributeServices.bulkCreateAttributes(
    req.body.attributes,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.succeeded} attributes created, ${result.failed.length} failed`,
    data: result,
  });
});

const getAttributes = catchAsync(async (req, res) => {
  const { data, pagination } = await attributeServices.getAttributes(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attributes retrieved successfully",
    data,
    pagination,
  });
});

const getShowingAttributes = catchAsync(async (_req, res) => {
  const result = await attributeServices.getShowingAttributes();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Published attributes retrieved successfully",
    data: result,
  });
});

const getAttributeById = catchAsync(async (req, res) => {
  const result = await attributeServices.getAttributeById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attribute retrieved successfully",
    data: result,
  });
});

const updateAttribute = catchAsync(async (req, res) => {
  const result = await attributeServices.updateAttribute(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attribute updated successfully",
    data: result,
  });
});

const updateAttributeStatus = catchAsync(async (req, res) => {
  const result = await attributeServices.updateAttributeStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Attribute ${
      req.body.status === "show" ? "published" : "un-published"
    } successfully`,
    data: result,
  });
});

const deleteAttribute = catchAsync(async (req, res) => {
  const result = await attributeServices.deleteAttribute(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attribute deleted successfully",
    data: result,
  });
});

const addAttributeValue = catchAsync(async (req, res) => {
  const result = await attributeServices.addAttributeValue(
    req.params.id,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Attribute value added successfully",
    data: result,
  });
});

const updateAttributeValue = catchAsync(async (req, res) => {
  const result = await attributeServices.updateAttributeValue(
    req.params.id,
    req.params.valueId,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attribute value updated successfully",
    data: result,
  });
});

const updateAttributeValueStatus = catchAsync(async (req, res) => {
  const result = await attributeServices.updateAttributeValueStatus(
    req.params.id,
    req.params.valueId,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Attribute value ${
      req.body.status === "show" ? "published" : "un-published"
    } successfully`,
    data: result,
  });
});

const deleteAttributeValue = catchAsync(async (req, res) => {
  const result = await attributeServices.deleteAttributeValue(
    req.params.id,
    req.params.valueId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Attribute value deleted successfully",
    data: result,
  });
});

const bulkUpdateAttributes = catchAsync(async (req, res) => {
  const { ids, ...payload } = req.body;
  const result = await attributeServices.bulkUpdateAttributes(ids, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} attributes updated`,
    data: result,
  });
});

const bulkDeleteAttributes = catchAsync(async (req, res) => {
  const result = await attributeServices.bulkDeleteAttributes(req.body.ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} attributes deleted`,
    data: result,
  });
});

const bulkDeleteAttributeValues = catchAsync(async (req, res) => {
  const result = await attributeServices.bulkDeleteAttributeValues(
    req.params.id,
    req.body.valueIds,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} attribute values deleted`,
    data: result,
  });
});

export const attributeController = {
  createAttribute,
  bulkCreateAttributes,
  getAttributes,
  getShowingAttributes,
  getAttributeById,
  updateAttribute,
  updateAttributeStatus,
  deleteAttribute,
  addAttributeValue,
  updateAttributeValue,
  updateAttributeValueStatus,
  deleteAttributeValue,
  bulkUpdateAttributes,
  bulkDeleteAttributes,
  bulkDeleteAttributeValues,
};
