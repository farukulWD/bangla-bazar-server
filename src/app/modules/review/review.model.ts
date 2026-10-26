import { Schema, model } from "mongoose";

import {
  REVIEW_COMMENT_MAX,
  REVIEW_RATING_MAX,
  REVIEW_RATING_MIN,
  REVIEW_REJECTION_MAX,
  REVIEW_REPLY_MAX,
  REVIEW_STATUS,
  REVIEW_TITLE_MAX,
} from "./review.constant";
import { TReview, TReviewReply } from "./review.interface";

const replySchema = new Schema<TReviewReply>(
  {
    text: {
      type: String,
      required: true,
      trim: true,
      maxlength: REVIEW_REPLY_MAX,
    },
    repliedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    repliedAt: {
      type: Date,
      required: true,
    },
  },
  { _id: false },
);

const reviewSchema = new Schema<TReview>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    order: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    rating: {
      type: Number,
      required: true,
      min: REVIEW_RATING_MIN,
      max: REVIEW_RATING_MAX,
    },
    title: {
      type: String,
      trim: true,
      default: "",
      maxlength: REVIEW_TITLE_MAX,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
      maxlength: REVIEW_COMMENT_MAX,
    },
    status: {
      type: String,
      lowercase: true,
      enum: REVIEW_STATUS,
      default: "pending",
    },
    rejectionReason: {
      type: String,
      trim: true,
      default: "",
      maxlength: REVIEW_REJECTION_MAX,
    },
    reply: {
      type: replySchema,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

reviewSchema.index({ user: 1, product: 1 }, { unique: true });
reviewSchema.index({ product: 1, status: 1, createdAt: -1 });
reviewSchema.index({ status: 1, createdAt: -1 });

export const Review = model<TReview>("Review", reviewSchema);
