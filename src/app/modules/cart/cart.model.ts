import { Schema, model } from "mongoose";

import { CART_MAX_QTY } from "./cart.constant";
import { TCart, TCartItem } from "./cart.interface";

const cartItemSchema = new Schema<TCartItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  variant: {
    type: Schema.Types.ObjectId,
    default: null,
  },
  qty: {
    type: Number,
    required: true,
    min: 1,
    max: CART_MAX_QTY,
  },
});

const cartSchema = new Schema<TCart>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
  },
  {
    timestamps: true,
  },
);

export const Cart = model<TCart>("Cart", cartSchema);
