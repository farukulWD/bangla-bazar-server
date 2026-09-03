import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { couponServices } from "./coupon.services";

const createCoupon = catchAsync(async (req, res) => {
  const result = await couponServices.createCoupon(req.body, req.file);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Coupon created successfully",
    data: result,
  });
});

const bulkCreateCoupons = catchAsync(async (req, res) => {
  const result = await couponServices.bulkCreateCoupons(req.body.coupons);

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: `${result.succeeded} coupons created, ${result.failed.length} failed`,
    data: result,
  });
});

const getCoupons = catchAsync(async (req, res) => {
  const { data, pagination } = await couponServices.getCoupons(
    req.query as Record<string, unknown>,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupons retrieved successfully",
    data,
    pagination,
  });
});

const getShowingCoupons = catchAsync(async (_req, res) => {
  const result = await couponServices.getShowingCoupons();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Published coupons retrieved successfully",
    data: result,
  });
});

const getCouponById = catchAsync(async (req, res) => {
  const result = await couponServices.getCouponById(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon retrieved successfully",
    data: result,
  });
});

const updateCoupon = catchAsync(async (req, res) => {
  const result = await couponServices.updateCoupon(
    req.params.id,
    req.body,
    req.file,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon updated successfully",
    data: result,
  });
});

const updateCouponStatus = catchAsync(async (req, res) => {
  const result = await couponServices.updateCouponStatus(
    req.params.id,
    req.body.status,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `Coupon ${
      req.body.status === "show" ? "published" : "un-published"
    } successfully`,
    data: result,
  });
});

const deleteCoupon = catchAsync(async (req, res) => {
  const result = await couponServices.deleteCoupon(req.params.id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon deleted successfully",
    data: result,
  });
});

const bulkUpdateCoupons = catchAsync(async (req, res) => {
  const { ids, ...payload } = req.body;
  const result = await couponServices.bulkUpdateCoupons(ids, payload);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} coupons updated`,
    data: result,
  });
});

const bulkDeleteCoupons = catchAsync(async (req, res) => {
  const result = await couponServices.bulkDeleteCoupons(req.body.ids);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: `${result.succeeded} coupons deleted`,
    data: result,
  });
});

const applyCoupon = catchAsync(async (req, res) => {
  const result = await couponServices.applyCoupon(
    req.body.couponCode,
    req.body.cartTotal,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Coupon applied successfully",
    data: result,
  });
});

export const couponController = {
  createCoupon,
  bulkCreateCoupons,
  getCoupons,
  getShowingCoupons,
  getCouponById,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
  bulkUpdateCoupons,
  bulkDeleteCoupons,
  applyCoupon,
};
