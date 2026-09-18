import { model, Schema } from "mongoose";
import { CATEGORY_STATUS } from "./category.constant";
import { TCategory } from "./category.interface";

const categorySchema = new Schema<TCategory>(
  {
    name: {
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
    parentId: {
      type: Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    parentName: {
      type: String,
      required: false,
      trim: true,
    },
    icon: {
      type: String,
      required: false,
    },
    status: {
      type: String,
      lowercase: true,
      enum: CATEGORY_STATUS,
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

categorySchema.index({ name: "text" });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ isDeleted: 1, status: 1 });
categorySchema.index({ parentId: 1 });

export const Category = model<TCategory>("Category", categorySchema);
