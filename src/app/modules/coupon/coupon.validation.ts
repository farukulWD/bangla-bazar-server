import { Types } from "mongoose";
import z from "zod";
import {
  COUPON_BULK_MAX,
  COUPON_CODE_MAX,
  COUPON_DISCOUNT_TYPES,
  COUPON_STATUS,
  COUPON_TITLE_MAX,
} from "./coupon.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const dateString = z
  .string()
  .trim()
  .refine(
    (value) => !Number.isNaN(Date.parse(value)),
    "That is not a valid date",
  );

const title = z
  .string()
  .trim()
  .min(1, "Coupon title is required")
  .max(COUPON_TITLE_MAX, "Coupon title is too long");

const couponCode = z
  .string()
  .trim()
  .min(1, "Coupon code is required")
  .max(COUPON_CODE_MAX, "Coupon code is too long")
  .regex(
    /^[A-Za-z0-9_-]+$/,
    "Use letters, numbers, hyphens or underscores only",
  );

const logo = z.string().trim().optional();
const status = z.enum(COUPON_STATUS);
const discountType = z.enum(COUPON_DISCOUNT_TYPES);

const discountValue = z.number().positive("Discount must be greater than 0");

const money = (label: string) =>
  z.number().nonnegative(`${label} cannot be negative`).finite();

const couponBaseSchema = z.object({
  title,
  couponCode,
  logo,
  startTime: dateString.optional(),
  endTime: dateString,
  discountType,
  discountValue,
  maxDiscountAmount: money("Maximum discount").optional(),
  minimumAmount: money("Minimum amount").optional(),
  status: status.optional(),
});

type TCouponWindow = { startTime?: string; endTime?: string };

/** Only checks what it is given: on an update either bound may be absent. */
const endsAfterItStarts = (window: TCouponWindow): boolean => {
  if (!window.startTime || !window.endTime) return true;
  return Date.parse(window.endTime) > Date.parse(window.startTime);
};

type TCouponDiscount = { discountType?: string; discountValue?: number };

const percentageIsInRange = (discount: TCouponDiscount): boolean =>
  discount.discountType !== "percentage" ||
  discount.discountValue === undefined ||
  discount.discountValue <= 100;

/**
 * Also applied row by row inside the bulk create service, so a single malformed
 * entry is reported against its index instead of rejecting the whole batch.
 */
export const couponRowSchema = couponBaseSchema
  .refine(endsAfterItStarts, {
    error: "The coupon must end after it starts",
    path: ["endTime"],
  })
  .refine(percentageIsInRange, {
    error: "A percentage discount cannot be more than 100",
    path: ["discountValue"],
  });

const ids = z
  .array(objectId)
  .min(1, "Select at least one coupon")
  .max(COUPON_BULK_MAX, `Select at most ${COUPON_BULK_MAX} coupons at a time`);

const idParams = z.object({ id: objectId });

const createCouponValidationSchema = z.object({
  body: couponRowSchema,
});

const updateCouponValidationSchema = z.object({
  params: idParams,
  body: couponBaseSchema
    .partial()
    .refine((body) => Object.keys(body).length > 0, "Nothing to update")
    .refine(endsAfterItStarts, {
      error: "The coupon must end after it starts",
      path: ["endTime"],
    })
    .refine(percentageIsInRange, {
      error: "A percentage discount cannot be more than 100",
      path: ["discountValue"],
    }),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status }),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

/**
 * Only the envelope is checked here — the rows themselves are validated in the
 * service against `couponRowSchema` so that one bad entry does not cost the caller
 * the rest of the batch.
 */
const bulkCreateValidationSchema = z.object({
  body: z.object({
    coupons: z
      .array(z.unknown())
      .min(1, "Send at least one coupon")
      .max(
        COUPON_BULK_MAX,
        `Send at most ${COUPON_BULK_MAX} coupons at a time`,
      ),
  }),
});

const bulkUpdateValidationSchema = z.object({
  body: z
    .object({
      ids,
      status: status.optional(),
      startTime: dateString.optional(),
      endTime: dateString.optional(),
    })
    .refine(endsAfterItStarts, {
      error: "The coupon must end after it starts",
      path: ["endTime"],
    }),
});

const bulkDeleteValidationSchema = z.object({
  body: z.object({ ids }),
});

const applyCouponValidationSchema = z.object({
  body: z.object({
    couponCode,
    cartTotal: money("Cart total"),
  }),
});

export const couponValidation = {
  createCouponValidationSchema,
  updateCouponValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
  bulkCreateValidationSchema,
  bulkUpdateValidationSchema,
  bulkDeleteValidationSchema,
  applyCouponValidationSchema,
};
