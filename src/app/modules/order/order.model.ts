import { Schema, model } from "mongoose";

import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SHIPPING_OPTION_KEYS,
} from "./order.constant";
import {
  TOrder,
  TOrderAddress,
  TOrderCoupon,
  TOrderCurrency,
  TOrderCounter,
  TOrderItem,
  TOrderStatusEntry,
} from "./order.interface";

const SHIPPING_KEYS = [...SHIPPING_OPTION_KEYS];

const orderOptionSchema = new Schema(
  {
    attribute: { type: String, required: true },
    value: { type: String, required: true },
  },
  { _id: false },
);

const orderItemSchema = new Schema<TOrderItem>(
  {
    product: {
      type: Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    variant: {
      type: Schema.Types.ObjectId,
      default: null,
    },
    title: { type: String, required: true },
    slug: { type: String, default: "" },
    image: { type: String, default: "" },
    sku: { type: String, default: "" },
    options: { type: [orderOptionSchema], default: [] },
    price: { type: Number, required: true, min: 0 },
    originalPrice: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotal: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderCurrencySchema = new Schema<TOrderCurrency>(
  {
    code: { type: String, required: true, uppercase: true },
    symbol: { type: String, required: true },
    symbolPosition: { type: String, enum: ["before", "after"], default: "before" },
    decimals: { type: Number, required: true, min: 0, max: 4 },
    thousandSeparator: { type: String, default: "," },
    decimalSeparator: { type: String, default: "." },
  },
  { _id: false },
);

const orderAddressSchema = new Schema<TOrderAddress>(
  {
    name: { type: String, required: true },
    contact: { type: String, required: true },
    email: { type: String, default: "" },
    address: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    area: { type: String, default: "" },
    zipCode: { type: String, default: "" },
  },
  { _id: false },
);

const orderCouponSchema = new Schema<TOrderCoupon>(
  {
    coupon: { type: Schema.Types.ObjectId, ref: "Coupon", required: true },
    code: { type: String, required: true },
    title: { type: String, default: "" },
    discountType: { type: String, lowercase: true, required: true },
    discountValue: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderStatusEntrySchema = new Schema<TOrderStatusEntry>(
  {
    status: {
      type: String,
      lowercase: true,
      enum: ORDER_STATUS,
      required: true,
    },
    at: { type: Date, required: true },

    by: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<TOrder>(
  {
    invoice: {
      type: Number,
      required: true,
      unique: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    items: {
      type: [orderItemSchema],
      required: true,
    },
    address: {
      type: orderAddressSchema,
      required: true,
    },
    subtotal: { type: Number, required: true, min: 0 },
    shippingCost: { type: Number, required: true, min: 0 },
    discount: { type: Number, default: 0, min: 0 },
    coupon: { type: orderCouponSchema, default: null },
    total: { type: Number, required: true, min: 0 },
    currency: { type: orderCurrencySchema, required: true },
    shippingOption: {
      type: String,
      lowercase: true,
      enum: SHIPPING_KEYS,
      required: true,
    },
    paymentMethod: {
      type: String,
      lowercase: true,
      enum: PAYMENT_METHODS,
      required: true,
    },
    paymentStatus: {
      type: String,
      lowercase: true,
      enum: PAYMENT_STATUSES,
      default: "pending",
    },
    status: {
      type: String,
      lowercase: true,
      // TODO: Should be dynamic
      enum: ORDER_STATUS,
      default: "pending",
    },
    statusHistory: {
      type: [orderStatusEntrySchema],
      default: [],
    },
    stockRestoredAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    deliveredAt: { type: Date, default: null },
    cancelledAt: { type: Date, default: null },
  },
  {
    timestamps: true,
  },
);

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "address.name": 1 });
orderSchema.index({ "address.contact": 1 });

export const Order = model<TOrder>("Order", orderSchema);

const orderCounterSchema = new Schema<TOrderCounter>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true },
  },
  { versionKey: false },
);

export const OrderCounter = model<TOrderCounter>(
  "OrderCounter",
  orderCounterSchema,
);
