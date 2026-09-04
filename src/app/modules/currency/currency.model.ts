import { Schema, model } from "mongoose";

import {
  CURRENCY_DECIMALS_MAX,
  CURRENCY_NAME_MAX,
  CURRENCY_STATUS,
  CURRENCY_SYMBOL_MAX,
  SYMBOL_POSITIONS,
} from "./currency.constant";
import { TCurrency } from "./currency.interface";

const currencySchema = new Schema<TCurrency>(
  {
    code: {
      type: String,
      required: true,
      trim: true,
      uppercase: true,
      minlength: 3,
      maxlength: 3,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CURRENCY_NAME_MAX,
    },
    symbol: {
      type: String,
      required: true,
      trim: true,
      maxlength: CURRENCY_SYMBOL_MAX,
    },
    symbolPosition: {
      type: String,
      lowercase: true,
      enum: SYMBOL_POSITIONS,
      default: "before",
    },
    decimals: {
      type: Number,
      min: 0,
      max: CURRENCY_DECIMALS_MAX,
      default: 2,
    },
    thousandSeparator: { type: String, default: "," },
    decimalSeparator: { type: String, default: "." },
    rate: {
      type: Number,
      required: true,
      min: 0,
    },
    isBase: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      lowercase: true,
      enum: CURRENCY_STATUS,
      default: "inactive",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    rateUpdatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

currencySchema.index(
  { code: 1 },
  { unique: true, partialFilterExpression: { isDeleted: false } },
);

/**
 * Exactly one base, enforced in Mongo rather than only in the service: two bases
 * would make every stored rate mean something different depending on which row
 * happened to be read first.
 */
currencySchema.index(
  { isBase: 1 },
  { unique: true, partialFilterExpression: { isBase: true } },
);

currencySchema.index({ isDeleted: 1, status: 1 });

export const Currency = model<TCurrency>("Currency", currencySchema);
