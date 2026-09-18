import { Schema, model } from "mongoose";

import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_BODY_MAX,
  NOTIFICATION_EVENTS,
  NOTIFICATION_RETENTION_DAYS,
  NOTIFICATION_SUBJECT_KINDS,
  NOTIFICATION_TITLE_MAX,
} from "./notification.constant";
import { TNotification, TNotificationSubject } from "./notification.interface";

const subjectSchema = new Schema<TNotificationSubject>(
  {
    kind: { type: String, enum: NOTIFICATION_SUBJECT_KINDS, required: true },
    id: { type: String, required: true },
    code: { type: String },
  },
  { _id: false },
);

const notificationSchema = new Schema<TNotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    audience: { type: String, enum: NOTIFICATION_AUDIENCES, required: true },
    event: { type: String, enum: NOTIFICATION_EVENTS, required: true },
    title: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_TITLE_MAX,
    },
    body: {
      type: String,
      required: true,
      trim: true,
      maxlength: NOTIFICATION_BODY_MAX,
    },
    subject: { type: subjectSchema, required: true },
    link: { type: String, required: true },
    dedupeKey: { type: String, required: true },
    readAt: { type: Date, default: null },
  },
  { timestamps: true },
);

notificationSchema.index({ user: 1, audience: 1, createdAt: -1 });

notificationSchema.index({ user: 1, audience: 1, readAt: 1 });
notificationSchema.index(
  { user: 1, audience: 1, dedupeKey: 1 },
  { unique: true },
);

notificationSchema.index(
  { createdAt: 1 },
  { expireAfterSeconds: NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 },
);

export const Notification = model<TNotification>(
  "Notification",
  notificationSchema,
);
