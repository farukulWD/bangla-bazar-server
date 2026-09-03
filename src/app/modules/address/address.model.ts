import { Schema, model } from "mongoose";

import {
  ADDRESS_CONTACT_MAX,
  ADDRESS_DETAIL_MAX,
  ADDRESS_EMAIL_MAX,
  ADDRESS_NAME_MAX,
  ADDRESS_PLACE_MAX,
  ADDRESS_ZIP_MAX,
} from "./address.constant";
import { TAddress } from "./address.interface";

const addressSchema = new Schema<TAddress>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_NAME_MAX,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_CONTACT_MAX,
    },
    email: {
      type: String,
      default: "",
      trim: true,
      lowercase: true,
      maxlength: ADDRESS_EMAIL_MAX,
    },
    address: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_DETAIL_MAX,
    },
    country: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_PLACE_MAX,
      default: "Bangladesh",
    },
    city: {
      type: String,
      required: true,
      trim: true,
      maxlength: ADDRESS_PLACE_MAX,
    },
    // Not every city in the client's location list has areas under it.
    area: {
      type: String,
      default: "",
      trim: true,
      maxlength: ADDRESS_PLACE_MAX,
    },
    zipCode: {
      type: String,
      default: "",
      trim: true,
      maxlength: ADDRESS_ZIP_MAX,
    },
    isDefault: {
      type: Boolean,
      default: false,
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

addressSchema.index({ user: 1, isDeleted: 1, createdAt: -1 });
addressSchema.index(
  { user: 1, isDefault: 1 },
  {
    unique: true,
    partialFilterExpression: { isDefault: true, isDeleted: false },
  },
);

export const Address = model<TAddress>("Address", addressSchema);
