import { model, Schema } from "mongoose";
import { IMAGE_STATUS, PRODUCT_STATUS } from "./product.constant";
import { TProduct, TProductVariant, TVariantOption } from "./product.interface";

const variantOptionSchema = new Schema<TVariantOption>(
  {
    attributeId: {
      type: Schema.Types.ObjectId,
      ref: "Attribute",
      required: true,
    },
    valueId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
  },
  { _id: false },
);

const variantSchema = new Schema<TProductVariant>({
  options: {
    type: [variantOptionSchema],
    required: true,
  },
  sku: {
    type: String,
    required: false,
    trim: true,
  },
  barcode: {
    type: String,
    required: false,
    trim: true,
  },
  originalPrice: {
    type: Number,
    required: true,
    min: 0,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  discount: {
    type: Number,
    default: 0,
    min: 0,
  },
  stock: {
    type: Number,
    default: 0,
    min: 0,
  },
  image: {
    type: String,
    required: false,
  },
  isDeleted: {
    type: Boolean,
    default: false,
  },
});

const productSchema = new Schema<TProduct>(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: false,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },
    sku: {
      type: String,
      required: false,
      trim: true,
    },
    barcode: {
      type: String,
      required: false,
      trim: true,
    },
    category: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      required: true,
    },
    categories: {
      type: [{ type: Schema.Types.ObjectId, ref: "Category" }],
      default: [],
    },
    images: {
      type: [String],
      default: [],
    },
    imageStatus: {
      type: String,
      lowercase: true,
      enum: IMAGE_STATUS,
      default: "ready",
    },
    tags: {
      type: [String],
      default: [],
    },
    prices: {
      originalPrice: { type: Number, required: true, min: 0 },
      price: { type: Number, required: true, min: 0 },
      discount: { type: Number, default: 0, min: 0 },
    },
    stock: {
      type: Number,
      default: 0,
      min: 0,
    },
    sales: {
      type: Number,
      default: 0,
      min: 0,
    },
    isCombination: {
      type: Boolean,
      default: false,
    },
    variants: {
      type: [variantSchema],
      default: [],
    },
    status: {
      type: String,
      lowercase: true,
      enum: PRODUCT_STATUS,
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

productSchema.index({ title: "text", tags: "text" });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ isDeleted: 1, status: 1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ categories: 1 });
productSchema.index({ "variants.options.valueId": 1 });
productSchema.index({ sku: 1 }, { sparse: true });

export const Product = model<TProduct>("Product", productSchema);
