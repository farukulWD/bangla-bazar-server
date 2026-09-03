import { model, Schema } from "mongoose";
import {
  COUPON_CODE_MAX,
  COUPON_DISCOUNT_TYPES,
  COUPON_STATUS,
  COUPON_TITLE_MAX,
} from "./coupon.constant";
import { TCoupon } from "./coupon.interface";

const couponSchema = new Schema<TCoupon>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: COUPON_TITLE_MAX,
    },
    couponCode: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      maxlength: COUPON_CODE_MAX,
    },
    logo: {
      type: String,
      required: false,
    },
    startTime: {
      type: Date,
      required: false,
    },
    endTime: {
      type: Date,
      required: true,
    },
    discountType: {
      type: String,
      lowercase: true,
      enum: COUPON_DISCOUNT_TYPES,
      required: true,
    },
    discountValue: {
      type: Number,
      required: true,
      min: 0,
    },
    maxDiscountAmount: {
      type: Number,
      required: false,
      min: 0,
    },
    minimumAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    status: {
      type: String,
      lowercase: true,
      enum: COUPON_STATUS,
      default: "show",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

couponSchema.index(
  { couponCode: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);
couponSchema.index({ isDeleted: 1, status: 1, endTime: 1 });

export const Coupon = model<TCoupon>("Coupon", couponSchema);
