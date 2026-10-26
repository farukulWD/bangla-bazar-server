import { Types } from "mongoose";

import { REVIEW_PUBLIC_SORTS, REVIEW_STATUS } from "./review.constant";

export type TReviewStatus = (typeof REVIEW_STATUS)[number];

export type TReviewPublicSort = (typeof REVIEW_PUBLIC_SORTS)[number];

export type TReviewReply = {
  text: string;
  repliedBy: Types.ObjectId;
  repliedAt: Date;
};

export type TReview = {
  _id: Types.ObjectId;
  product: Types.ObjectId;
  user: Types.ObjectId;
  order: Types.ObjectId;
  rating: number;
  title: string;
  comment: string;
  status: TReviewStatus;
  rejectionReason: string;
  reply: TReviewReply | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TCreateReview = {
  product: string;
  rating: number;
  title?: string;
  comment: string;
};

export type TUpdateMyReview = {
  rating?: number;
  title?: string;
  comment?: string;
};

export type TReviewBreakdown = Record<"1" | "2" | "3" | "4" | "5", number>;

export type TReviewSummary = {
  average: number;
  count: number;
  breakdown: TReviewBreakdown;
};

export type TReviewEligibility = {
  canReview: boolean;
  reason: "not_delivered" | "already_reviewed" | null;
  orderId: string | null;
  review: TReview | null;
};
