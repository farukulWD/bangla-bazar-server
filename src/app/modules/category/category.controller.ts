import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { categoryServices } from "./category.services";

const createCategory = catchAsync(async (req, res) => {
  const result = await categoryServices.createCategory(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Category created successfully",
    data: result,
  });
});

const bulkCreateCategories = catchAsync(async (req, res) => {
  const result = await categoryServices.bulkCreateCategories(
    req.body.categories,
  );

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.succeeded} categories created, ${result.failed.length} failed`,
    data: result,
  });
});

const getCategories = catchAsync(async (req, res) => {
  const { data, pagination } = await categoryServices.getCategories(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Categories retrieved successfully",
    data,
    pagination,
  });
});

const getCategoryTree = catchAsync(async (_req, res) => {
  const result = await categoryServices.getCategoryTree();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category tree retrieved successfully",
    data: result,
  });
});

const getShowingCategoryTree = catchAsync(async (_req, res) => {
  const result = await categoryServices.getShowingCategoryTree();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Published category tree retrieved successfully",
    data: result,
  });
});

const getCategoryById = catchAsync(async (req, res) => {
  const result = await categoryServices.getCategoryById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category retrieved successfully",
    data: result,
  });
});

const updateCategory = catchAsync(async (req, res) => {
  const result = await categoryServices.updateCategory(
    req.params.id,
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category updated successfully",
    data: result,
  });
});

const updateCategoryStatus = catchAsync(async (req, res) => {
  const result = await categoryServices.updateCategoryStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Category ${
      req.body.status === "show" ? "published" : "un-published"
    } successfully`,
    data: result,
  });
});

const deleteCategory = catchAsync(async (req, res) => {
  const result = await categoryServices.deleteCategory(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Category deleted successfully",
    data: result,
  });
});

const bulkUpdateCategories = catchAsync(async (req, res) => {
  const { ids, ...payload } = req.body;
  const result = await categoryServices.bulkUpdateCategories(ids, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} categories updated`,
    data: result,
  });
});

const bulkDeleteCategories = catchAsync(async (req, res) => {
  const result = await categoryServices.bulkDeleteCategories(req.body.ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} categories deleted`,
    data: result,
  });
});

export const categoryController = {
  createCategory,
  bulkCreateCategories,
  getCategories,
  getCategoryTree,
  getShowingCategoryTree,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  bulkUpdateCategories,
  bulkDeleteCategories,
};
