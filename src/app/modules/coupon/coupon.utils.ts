import { TCoupon } from "./coupon.interface";

/** Codes are compared and stored in one case so `SAVE10` and `save10` are the same coupon. */
export const normalizeCouponCode = (code: string): string =>
  code.trim().toUpperCase();

/** Money is rounded at the boundary so a percentage never yields fractions of a poisha. */
const toMoney = (amount: number): number => Math.round(amount * 100) / 100;

/**
 * Pure on purpose: the order module can settle a discount through this without
 * going back out over HTTP.
 */
export const calculateDiscount = (
  coupon: Pick<
    TCoupon,
    "discountType" | "discountValue" | "maxDiscountAmount"
  >,
  cartTotal: number,
): number => {
  const raw =
    coupon.discountType === "percentage"
      ? (cartTotal * coupon.discountValue) / 100
      : coupon.discountValue;

  const capped =
    coupon.discountType === "percentage" && coupon.maxDiscountAmount !== undefined
      ? Math.min(raw, coupon.maxDiscountAmount)
      : raw;

  // A fixed discount larger than the cart must not make the payable amount negative.
  return toMoney(Math.min(capped, cartTotal));
};

export const toPayable = (cartTotal: number, discount: number): number =>
  toMoney(cartTotal - discount);
