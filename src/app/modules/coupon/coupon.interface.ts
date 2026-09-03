import { HydratedDocument, Types } from "mongoose";

export type TCouponStatus = "show" | "hide";

export type TDiscountType = "percentage" | "fixed";

export type TCoupon = {
  title: string;
  couponCode: string;
  logo?: string;
  startTime?: Date;
  endTime: Date;
  discountType: TDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minimumAmount: number;
  status: TCouponStatus;
  isDeleted: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type TCouponDocument = HydratedDocument<TCoupon>;

export type TCreateCoupon = {
  title: string;
  couponCode: string;
  logo?: string;
  startTime?: string;
  endTime: string;
  discountType: TDiscountType;
  discountValue: number;
  maxDiscountAmount?: number;
  minimumAmount?: number;
  status?: TCouponStatus;
};

export type TUpdateCoupon = Partial<TCreateCoupon>;

export type TApplyCouponResult = {
  coupon: TCouponDocument;
  discount: number;
  payable: number;
};

export type TBulkResult = {
  succeeded: number;
  failed: { index: number; identifier?: string; error: string }[];
};
