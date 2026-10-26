import httpStatus from "http-status";

import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { TAuthUser } from "../auth/auth.interface";
import { reviewServices } from "./review.services";

const getEligibility = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await reviewServices.getEligibility(
    caller._id,
    req.params.productId as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review eligibility retrieved successfully",
    data: result,
  });
});

const createReview = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await reviewServices.createReview(caller._id, req.body);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Review submitted successfully",
    data: result,
  });
});

const getMyReviews = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const { data, pagination } = await reviewServices.getMyReviews(
    caller._id,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data,
    pagination,
  });
});

const updateMyReview = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await reviewServices.updateMyReview(
    caller._id,
    req.params.id as string,
    req.body,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review updated successfully",
    data: result,
  });
});

const deleteMyReview = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await reviewServices.deleteMyReview(
    caller._id,
    req.params.id as string,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

const getProductReviews = catchAsync(async (req, res) => {
  const { data, pagination, summary } = await reviewServices.getProductReviews(
    req.params.productId as string,
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data: { reviews: data, summary },
    pagination,
  });
});

const getReviews = catchAsync(async (req, res) => {
  const { data, pagination } = await reviewServices.getReviews(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews retrieved successfully",
    data,
    pagination,
  });
});

const getReviewById = catchAsync(async (req, res) => {
  const result = await reviewServices.getReviewById(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review retrieved successfully",
    data: result,
  });
});

const updateReviewStatus = catchAsync(async (req, res) => {
  const result = await reviewServices.updateReviewStatus(
    req.params.id as string,
    req.body.status,
    req.body.rejectionReason,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review status updated successfully",
    data: result,
  });
});

const bulkUpdateReviewStatus = catchAsync(async (req, res) => {
  const result = await reviewServices.bulkUpdateReviewStatus(
    req.body.ids,
    req.body.status,
    req.body.rejectionReason,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews updated successfully",
    data: result,
  });
});

const replyToReview = catchAsync(async (req, res) => {
  const caller = req.user as TAuthUser;
  const result = await reviewServices.replyToReview(
    req.params.id as string,
    req.body.text,
    caller._id,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.reply ? "Reply saved successfully" : "Reply removed",
    data: result,
  });
});

const deleteReview = catchAsync(async (req, res) => {
  const result = await reviewServices.deleteReview(req.params.id as string);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Review deleted successfully",
    data: result,
  });
});

const bulkDeleteReviews = catchAsync(async (req, res) => {
  const result = await reviewServices.bulkDeleteReviews(req.body.ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Reviews deleted successfully",
    data: result,
  });
});

export const reviewController = {
  getEligibility,
  createReview,
  getMyReviews,
  updateMyReview,
  deleteMyReview,
  getProductReviews,
  getReviews,
  getReviewById,
  updateReviewStatus,
  bulkUpdateReviewStatus,
  replyToReview,
  deleteReview,
  bulkDeleteReviews,
};
