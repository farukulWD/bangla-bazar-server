import { Types } from "mongoose";

import { TCartLineOption } from "../cart/cart.interface";
import { TDiscountType } from "../coupon/coupon.interface";
import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SHIPPING_OPTIONS,
} from "./order.constant";

export type TOrderStatus = (typeof ORDER_STATUS)[number];
export type TPaymentMethod = (typeof PAYMENT_METHODS)[number];
export type TPaymentStatus = (typeof PAYMENT_STATUSES)[number];
export type TShippingKey = (typeof SHIPPING_OPTIONS)[number]["key"];

export type TOrderItem = {
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  title: string;
  slug: string;
  image: string;
  sku: string;
  options: TCartLineOption[];
  price: number;
  originalPrice: number;
  qty: number;
  lineTotal: number;
};

export type TOrderAddress = {
  name: string;
  contact: string;
  email: string;
  address: string;
  country: string;
  city: string;
  area: string;
  zipCode: string;
};

/**
 * What the discount was, frozen at placement. The coupon is referenced for
 * analytics, but its terms are copied for the same reason the items are: a coupon
 * can be edited or deleted, and an invoice must still explain the money.
 */
export type TOrderCoupon = {
  coupon: Types.ObjectId;
  code: string;
  title: string;
  discountType: TDiscountType;
  discountValue: number;
};

export type TOrderStatusEntry = {
  status: TOrderStatus;
  at: Date;
  by: Types.ObjectId | null;
};

export type TOrder = {
  _id: Types.ObjectId;
  invoice: number;
  user: Types.ObjectId;
  items: TOrderItem[];
  address: TOrderAddress;
  subtotal: number;
  shippingCost: number;
  discount: number;
  coupon: TOrderCoupon | null;
  total: number;
  shippingOption: TShippingKey;
  paymentMethod: TPaymentMethod;
  paymentStatus: TPaymentStatus;
  status: TOrderStatus;
  statusHistory: TOrderStatusEntry[];
  stockRestoredAt: Date | null;
  paidAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TOrderCounter = {
  _id: string;
  seq: number;
};

export type TPlaceOrder = {
  addressId: string;
  shippingOption: TShippingKey;
  paymentMethod: TPaymentMethod;
  couponCode?: string;
};

export type TUpdateOrderStatus = {
  status: TOrderStatus;
};

export type TUpdatePaymentStatus = {
  paymentStatus: TPaymentStatus;
};

export type TOrderStats = {
  total: number;
} & Record<TOrderStatus, number>;

export type TCheckoutOptions = {
  shipping: (typeof SHIPPING_OPTIONS)[number][];
  paymentMethods: TPaymentMethod[];
  freeDeliveryOver: number;
};
