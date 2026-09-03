import httpStatus from "http-status";
import {
  getProductJob,
  queueBulkExport,
  queueBulkImport,
} from "../../queues/products.queue";
import AppError from "../../errors/AppError";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { productServices } from "./product.services";

const files = (req: { files?: unknown }) =>
  (req.files as Express.Multer.File[] | undefined) ?? undefined;

const createProduct = catchAsync(async (req, res) => {
  const result = await productServices.createProduct(req.body, files(req));

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Product created successfully",
    data: result,
  });
});

const getProducts = catchAsync(async (req, res) => {
  const { data, pagination } = await productServices.getProducts(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    data,
    pagination,
  });
});

const getShowingProducts = catchAsync(async (_req, res) => {
  const result = await productServices.getShowingProducts();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Products retrieved successfully",
    data: result,
  });
});

const getStoreProducts = catchAsync(async (req, res) => {
  const result = await productServices.getStoreProducts({
    category: req.query.category as string | undefined,
    title: req.query.title as string | undefined,
    slug: req.query.slug as string | undefined,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Store products retrieved successfully",
    data: result,
  });
});

const getDiscountedProducts = catchAsync(async (_req, res) => {
  const result = await productServices.getDiscountedProducts();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Discounted products retrieved successfully",
    data: result,
  });
});

const getProductById = catchAsync(async (req, res) => {
  const result = await productServices.getProductById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const getProductBySlug = catchAsync(async (req, res) => {
  const result = await productServices.getProductBySlug(req.params.slug);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product retrieved successfully",
    data: result,
  });
});

const updateProduct = catchAsync(async (req, res) => {
  const result = await productServices.updateProduct(
    req.params.id,
    req.body,
    files(req),
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product updated successfully",
    data: result,
  });
});

const updateProductStatus = catchAsync(async (req, res) => {
  const result = await productServices.updateProductStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Product ${result.status === "show" ? "shown" : "hidden"} successfully`,
    data: result,
  });
});

const deleteProduct = catchAsync(async (req, res) => {
  const result = await productServices.deleteProduct(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Product deleted successfully",
    data: result,
  });
});

const bulkCreateProducts = catchAsync(async (req, res) => {
  const jobId = await queueBulkImport({ rows: req.body.products });

  sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    success: true,
    message: `${req.body.products.length} products queued for import`,
    data: { jobId },
  });
});

const bulkUpdateProducts = catchAsync(async (req, res) => {
  const result = await productServices.bulkUpdateProducts(req.body.ids, {
    status: req.body.status,
    category: req.body.category,
  });

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.updated} products updated`,
    data: result,
  });
});

const bulkDeleteProducts = catchAsync(async (req, res) => {
  const result = await productServices.bulkDeleteProducts(req.body.ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.deleted} products deleted`,
    data: result,
  });
});

const bulkExportProducts = catchAsync(async (req, res) => {
  const jobId = await queueBulkExport({
    status: req.body.status,
    category: req.body.category,
  });

  sendResponse(res, {
    statusCode: httpStatus.ACCEPTED,
    success: true,
    message: "Export queued",
    data: { jobId },
  });
});

const getBulkJob = catchAsync(async (req, res) => {
  const job = await getProductJob(req.params.jobId);

  if (!job) {
    throw new AppError(httpStatus.NOT_FOUND, "That job is no longer on the queue");
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Job retrieved successfully",
    data: job,
  });
});

export const productController = {
  createProduct,
  getProducts,
  getShowingProducts,
  getStoreProducts,
  getDiscountedProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  bulkCreateProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  bulkExportProducts,
  getBulkJob,
};
