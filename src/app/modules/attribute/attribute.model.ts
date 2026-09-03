import { model, Schema } from "mongoose";
import {
  ATTRIBUTE_OPTIONS,
  ATTRIBUTE_STATUS,
  ATTRIBUTE_TYPES,
} from "./attribute.constant";
import { TAttribute, TAttributeValue } from "./attribute.interface";

const attributeValueSchema = new Schema<TAttributeValue>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      lowercase: true,
      enum: ATTRIBUTE_STATUS,
      default: "show",
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
  },
  { _id: true },
);

const attributeSchema = new Schema<TAttribute>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    option: {
      type: String,
      lowercase: true,
      enum: ATTRIBUTE_OPTIONS,
      required: true,
    },
    type: {
      type: String,
      lowercase: true,
      enum: ATTRIBUTE_TYPES,
      default: "attribute",
    },
    values: {
      type: [attributeValueSchema],
      default: [],
    },
    status: {
      type: String,
      lowercase: true,
      enum: ATTRIBUTE_STATUS,
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

attributeSchema.index({ name: "text" });
attributeSchema.index({ slug: 1 }, { unique: true });
attributeSchema.index({ isDeleted: 1, status: 1 });
attributeSchema.index({ type: 1, option: 1 });
attributeSchema.index({ "values._id": 1 });

export const Attribute = model<TAttribute>("Attribute", attributeSchema);
