import { model, Schema } from "mongoose";

import {
  CONTACT_EMAIL_MAX,
  CONTACT_MESSAGE_MAX,
  CONTACT_NAME_MAX,
  CONTACT_STATUS,
  CONTACT_SUBJECT_MAX,
} from "./contact.constant";
import { TContact } from "./contact.interface";

const contactSchema = new Schema<TContact>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_NAME_MAX,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: CONTACT_EMAIL_MAX,
    },
    subject: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_SUBJECT_MAX,
    },
    message: {
      type: String,
      required: true,
      trim: true,
      maxlength: CONTACT_MESSAGE_MAX,
    },
    status: {
      type: String,
      lowercase: true,
      enum: CONTACT_STATUS,
      default: "new",
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

contactSchema.index({ isDeleted: 1, status: 1, createdAt: -1 });

export const Contact = model<TContact>("Contact", contactSchema);
