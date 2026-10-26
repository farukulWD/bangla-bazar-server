import { Types } from "mongoose";
import z from "zod";

import {
  REVIEW_BULK_MAX,
  REVIEW_COMMENT_MAX,
  REVIEW_COMMENT_MIN,
  REVIEW_RATING_MAX,
  REVIEW_PUBLIC_LIMIT_MAX,
  REVIEW_PUBLIC_SORTS,
  REVIEW_RATING_MIN,
  REVIEW_REJECTION_MAX,
  REVIEW_REPLY_MAX,
  REVIEW_STATUS,
  REVIEW_TITLE_MAX,
} from "./review.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const idParams = z.object({ id: objectId });

const rating = z
  .number({ error: "Rating is required" })
  .int("Rating must be a whole number")
  .min(REVIEW_RATING_MIN, `Rating must be at least ${REVIEW_RATING_MIN}`)
  .max(REVIEW_RATING_MAX, `Rating can be at most ${REVIEW_RATING_MAX}`);

const title = z.string().trim().max(REVIEW_TITLE_MAX, "Title is too long");

const comment = z
  .string({ error: "Comment is required" })
  .trim()
  .min(
    REVIEW_COMMENT_MIN,
    `Comment must be at least ${REVIEW_COMMENT_MIN} characters`,
  )
  .max(REVIEW_COMMENT_MAX, "Comment is too long");

const createReviewValidationSchema = z.object({
  body: z.object({
    product: objectId,
    rating,
    title: title.optional(),
    comment,
  }),
});

const updateMyReviewValidationSchema = z.object({
  params: idParams,
  body: z
    .object({
      rating: rating.optional(),
      title: title.optional(),
      comment: comment.optional(),
    })
    .refine((value) => Object.keys(value).length > 0, "Nothing to update"),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

const productIdParamValidationSchema = z.object({
  params: z.object({ productId: objectId }),
});

const positiveInt = z
  .string()
  .trim()
  .regex(/^[1-9]\d*$/, "Must be a positive whole number");

const ratingFilter = z.enum(["1", "2", "3", "4", "5"], {
  error: "Rating filter is not valid",
});

const status = z.enum(REVIEW_STATUS, { error: "Status is not valid" });

const rejectionReason = z
  .string()
  .trim()
  .max(REVIEW_REJECTION_MAX, "Reason is too long")
  .optional();

const requireReasonWhenRejected = (value: {
  status: string;
  rejectionReason?: string;
}) => value.status !== "rejected" || Boolean(value.rejectionReason);

const reasonIssue = {
  message: "Give a reason for rejecting",
  path: ["rejectionReason"],
};

const ids = z
  .array(objectId, { error: "Select at least one review" })
  .min(1, "Select at least one review")
  .max(REVIEW_BULK_MAX, `You can change at most ${REVIEW_BULK_MAX} at once`);

const productReviewsValidationSchema = z.object({
  params: z.object({ productId: objectId }),
  query: z.object({
    page: positiveInt.optional(),
    limit: positiveInt
      .refine(
        (value) => Number(value) <= REVIEW_PUBLIC_LIMIT_MAX,
        `Limit can be at most ${REVIEW_PUBLIC_LIMIT_MAX}`,
      )
      .optional(),
    sort: z
      .enum(REVIEW_PUBLIC_SORTS, { error: "Sort is not valid" })
      .optional(),
    rating: ratingFilter.optional(),
  }),
});

const reviewListValidationSchema = z.object({
  query: z.object({
    searchTerm: z.string().trim().max(100).optional(),
    page: positiveInt.optional(),
    limit: positiveInt.optional(),
    sort: z
      .enum(["createdAt", "-createdAt", "rating", "-rating"], {
        error: "Sort is not valid",
      })
      .optional(),
    status: z.union([status, z.literal("")]).optional(),
    rating: z.union([ratingFilter, z.literal("")]).optional(),
    product: objectId.optional(),
  }),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z
    .object({ status, rejectionReason })
    .refine(requireReasonWhenRejected, reasonIssue),
});

const bulkStatusValidationSchema = z.object({
  body: z
    .object({ ids, status, rejectionReason })
    .refine(requireReasonWhenRejected, reasonIssue),
});

const replyValidationSchema = z.object({
  params: idParams,
  body: z.object({
    text: z
      .string({ error: "Reply is required" })
      .trim()
      .max(REVIEW_REPLY_MAX, "Reply is too long"),
  }),
});

const bulkDeleteValidationSchema = z.object({
  body: z.object({ ids }),
});

export const reviewValidation = {
  createReviewValidationSchema,
  updateMyReviewValidationSchema,
  idParamValidationSchema,
  productIdParamValidationSchema,
  productReviewsValidationSchema,
  reviewListValidationSchema,
  updateStatusValidationSchema,
  bulkStatusValidationSchema,
  replyValidationSchema,
  bulkDeleteValidationSchema,
};
