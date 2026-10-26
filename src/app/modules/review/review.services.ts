import httpStatus from "http-status";
import { Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { notify } from "../notification/notification.emit";
import { Order } from "../order/order.model";
import { Product } from "../product/product.model";
import {
  TCreateReview,
  TReview,
  TReviewBreakdown,
  TReviewEligibility,
  TReviewPublicSort,
  TReviewStatus,
  TReviewSummary,
  TUpdateMyReview,
} from "./review.interface";
import {
  REVIEW_QUERY_CONTROL_KEYS,
  REVIEW_SEARCHABLE_FIELDS,
} from "./review.constant";
import { Review } from "./review.model";
import { recalcProductRating, recalcProductRatings } from "./review.rating";

const reviewNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Review not found");

const productNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Product not found");

const notDelivered = () =>
  new AppError(
    httpStatus.FORBIDDEN,
    "You can review this product after it is delivered",
  );

const alreadyReviewed = () =>
  new AppError(httpStatus.CONFLICT, "You have already reviewed this product");

const pageOf = (query: Record<string, unknown>, total: number) => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return { page, limit, total, totalPage: Math.ceil(total / limit) };
};

const assertProduct = async (
  productId: string,
): Promise<{ _id: Types.ObjectId; title: string }> => {
  const product = await Product.findOne({ _id: productId, isDeleted: false })
    .select("_id title")
    .lean<{ _id: Types.ObjectId; title: string } | null>();

  if (!product) {
    throw productNotFound();
  }

  return product;
};

const findDeliveredOrder = async (
  user: Types.ObjectId,
  productId: string,
): Promise<Types.ObjectId | null> => {
  const order = await Order.findOne({
    user,
    status: "delivered",
    "items.product": productId,
  })
    .sort({ createdAt: -1 })
    .select("_id")
    .lean<{ _id: Types.ObjectId } | null>();

  return order?._id ?? null;
};

const getEligibility = async (
  user: Types.ObjectId,
  productId: string,
): Promise<TReviewEligibility> => {
  await assertProduct(productId);

  const review = await Review.findOne({
    user,
    product: productId,
  }).lean<TReview | null>();

  if (review) {
    return {
      canReview: false,
      reason: "already_reviewed",
      orderId: review.order.toString(),
      review,
    };
  }

  const orderId = await findDeliveredOrder(user, productId);

  return {
    canReview: Boolean(orderId),
    reason: orderId ? null : "not_delivered",
    orderId: orderId?.toString() ?? null,
    review: null,
  };
};

const createReview = async (
  user: Types.ObjectId,
  payload: TCreateReview,
): Promise<TReview> => {
  const product = await assertProduct(payload.product);

  if (await Review.exists({ user, product: payload.product })) {
    throw alreadyReviewed();
  }

  const orderId = await findDeliveredOrder(user, payload.product);

  if (!orderId) {
    throw notDelivered();
  }

  try {
    const created = await Review.create({
      product: payload.product,
      user,
      order: orderId,
      rating: payload.rating,
      title: payload.title ?? "",
      comment: payload.comment,
    });

    notify({
      event: "review.submitted",
      reviewId: created._id.toString(),
      productId: product._id.toString(),
      productTitle: product.title,
      rating: created.rating,
      actorId: user.toString(),
    });

    return created.toObject<TReview>();
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      throw alreadyReviewed();
    }
    throw error;
  }
};

const getMyReviews = async (
  user: Types.ObjectId,
  query: Record<string, unknown>,
): Promise<{ data: TReview[]; pagination: TPagination }> => {
  const reviewQuery = new QueryBuilder(
    Review.find({ user }).populate("product", "title slug images"),
    { page: query.page, limit: query.limit },
  ).sort();

  await reviewQuery.paginate();

  const reviews = await reviewQuery.modelQuery.lean<TReview[]>();

  return {
    data: reviews,
    pagination: pageOf(query, reviewQuery.total),
  };
};

const updateMyReview = async (
  user: Types.ObjectId,
  id: string,
  payload: TUpdateMyReview,
): Promise<TReview> => {
  const changes: Partial<TReview> = {};

  if (payload.rating !== undefined) changes.rating = payload.rating;
  if (payload.title !== undefined) changes.title = payload.title;
  if (payload.comment !== undefined) changes.comment = payload.comment;

  const updated = await Review.findOneAndUpdate(
    { _id: id, user },
    { $set: { ...changes, status: "pending", rejectionReason: "" } },
    { new: true, runValidators: true },
  ).lean<TReview | null>();

  if (!updated) {
    throw reviewNotFound();
  }

  await recalcProductRating(updated.product);

  return updated;
};

const deleteMyReview = async (
  user: Types.ObjectId,
  id: string,
): Promise<TReview> => {
  const deleted = await Review.findOneAndDelete({
    _id: id,
    user,
  }).lean<TReview | null>();

  if (!deleted) {
    throw reviewNotFound();
  }

  if (deleted.status === "approved") {
    await recalcProductRating(deleted.product);
  }

  return deleted;
};

const PUBLIC_SORT: Record<TReviewPublicSort, Record<string, 1 | -1>> = {
  newest: { createdAt: -1 },
  highest: { rating: -1, createdAt: -1 },
  lowest: { rating: 1, createdAt: -1 },
};

const emptyBreakdown = (): TReviewBreakdown => ({
  "1": 0,
  "2": 0,
  "3": 0,
  "4": 0,
  "5": 0,
});

const getProductSummary = async (
  productId: Types.ObjectId,
): Promise<TReviewSummary> => {
  const groups = await Review.aggregate<{ _id: number; count: number }>([
    { $match: { product: productId, status: "approved" } },
    { $group: { _id: "$rating", count: { $sum: 1 } } },
  ]);

  const breakdown = emptyBreakdown();
  let count = 0;
  let total = 0;

  groups.forEach((group) => {
    breakdown[String(group._id) as keyof TReviewBreakdown] = group.count;
    count += group.count;
    total += group._id * group.count;
  });

  return {
    average: count ? Math.round((total / count) * 10) / 10 : 0,
    count,
    breakdown,
  };
};

const getProductReviews = async (
  productId: string,
  query: Record<string, unknown>,
): Promise<{
  data: TReview[];
  pagination: TPagination;
  summary: TReviewSummary;
}> => {
  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;
  const sort = PUBLIC_SORT[(query.sort as TReviewPublicSort) ?? "newest"];

  const exists = await Product.exists({ _id: productId, isDeleted: false });

  if (!exists) {
    return {
      data: [],
      pagination: { page, limit, total: 0, totalPage: 0 },
      summary: { average: 0, count: 0, breakdown: emptyBreakdown() },
    };
  }

  const product = new Types.ObjectId(productId);
  const filter: Record<string, unknown> = { product, status: "approved" };

  if (query.rating) {
    filter.rating = Number(query.rating);
  }

  const [data, total, summary] = await Promise.all([
    Review.find(filter)
      .select("-order -rejectionReason")
      .populate("user", "name image")
      .sort(sort)
      .skip((page - 1) * limit)
      .limit(limit)
      .lean<TReview[]>(),
    Review.countDocuments(filter),
    getProductSummary(product),
  ]);

  return {
    data,
    pagination: { page, limit, total, totalPage: Math.ceil(total / limit) },
    summary,
  };
};

const pickStaffQuery = (query: Record<string, unknown>) => {
  const picked: Record<string, unknown> = {};

  ["searchTerm", "sort", "page", "limit", "status", "rating", "product"]
    .filter((key) => query[key] !== undefined && query[key] !== "")
    .forEach((key) => {
      picked[key] = query[key];
    });

  return picked;
};

const getReviews = async (
  query: Record<string, unknown>,
): Promise<{ data: TReview[]; pagination: TPagination }> => {
  const picked = pickStaffQuery(query);

  const reviewQuery = new QueryBuilder(
    Review.find()
      .populate("product", "title slug images isDeleted")
      .populate("user", "name email image"),
    picked,
  )
    .search(REVIEW_SEARCHABLE_FIELDS)
    .filter(REVIEW_QUERY_CONTROL_KEYS)
    .sort();

  await reviewQuery.paginate();

  const reviews = await reviewQuery.modelQuery.lean<TReview[]>();

  return {
    data: reviews,
    pagination: pageOf(picked, reviewQuery.total),
  };
};

const getReviewById = async (id: string): Promise<TReview> => {
  const review = await Review.findById(id)
    .populate("product", "title slug images isDeleted")
    .populate("user", "name email phone image")
    .populate("reply.repliedBy", "name")
    .lean<TReview | null>();

  if (!review) {
    throw reviewNotFound();
  }

  return review;
};

const updateReviewStatus = async (
  id: string,
  status: TReviewStatus,
  rejectionReason?: string,
): Promise<TReview> => {
  const review = await Review.findById(id);

  if (!review) {
    throw reviewNotFound();
  }

  const previous = review.status;

  review.status = status;
  review.rejectionReason = status === "rejected" ? (rejectionReason ?? "") : "";

  await review.save();

  if (
    previous !== status &&
    (previous === "approved" || status === "approved")
  ) {
    await recalcProductRating(review.product);
  }

  return review.toObject<TReview>();
};

const bulkUpdateReviewStatus = async (
  ids: string[],
  status: TReviewStatus,
  rejectionReason?: string,
): Promise<{ modified: number }> => {
  const affected = await Review.find({
    _id: { $in: ids },
    status: { $ne: status },
  })
    .select("product status")
    .lean<Pick<TReview, "product" | "status">[]>();

  const result = await Review.updateMany(
    { _id: { $in: ids } },
    {
      $set: {
        status,
        rejectionReason: status === "rejected" ? (rejectionReason ?? "") : "",
      },
    },
    { runValidators: true },
  );

  await recalcProductRatings(
    affected
      .filter((review) => review.status === "approved" || status === "approved")
      .map((review) => review.product),
  );

  return { modified: result.modifiedCount };
};

const replyToReview = async (
  id: string,
  text: string,
  repliedBy: Types.ObjectId,
): Promise<TReview> => {
  const trimmed = text.trim();

  const updated = await Review.findByIdAndUpdate(
    id,
    {
      $set: {
        reply: trimmed
          ? { text: trimmed, repliedBy, repliedAt: new Date() }
          : null,
      },
    },
    { new: true, runValidators: true },
  ).lean<TReview | null>();

  if (!updated) {
    throw reviewNotFound();
  }

  return updated;
};

const deleteReview = async (id: string): Promise<TReview> => {
  const deleted = await Review.findByIdAndDelete(id).lean<TReview | null>();

  if (!deleted) {
    throw reviewNotFound();
  }

  if (deleted.status === "approved") {
    await recalcProductRating(deleted.product);
  }

  return deleted;
};

const bulkDeleteReviews = async (
  ids: string[],
): Promise<{ deleted: number }> => {
  const approved = await Review.find({ _id: { $in: ids }, status: "approved" })
    .select("product")
    .lean<Pick<TReview, "product">[]>();

  const result = await Review.deleteMany({ _id: { $in: ids } });

  await recalcProductRatings(approved.map((review) => review.product));

  return { deleted: result.deletedCount };
};

export const reviewServices = {
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
