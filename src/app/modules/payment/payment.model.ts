import { Schema, model } from "mongoose";

import {
  PAYMENT_CALLBACK_SOURCES,
  PAYMENT_PROVIDERS,
  PAYMENT_STATES,
} from "./payment.constant";
import { TPayment, TPaymentCallbackEntry } from "./payment.interface";

const paymentCallbackSchema = new Schema<TPaymentCallbackEntry>(
  {
    source: { type: String, enum: PAYMENT_CALLBACK_SOURCES, required: true },
    at: { type: Date, required: true },
    gatewayStatus: { type: String, default: "" },
    valId: { type: String, default: "" },
    ip: { type: String, default: "" },
  },
  { _id: false },
);

const paymentSchema = new Schema<TPayment>(
  {
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },

    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    invoice: { type: Number, required: true },

    provider: {
      type: String,
      lowercase: true,
      enum: PAYMENT_PROVIDERS,
      default: "sslcommerz",
    },

    tranId: { type: String, required: true, trim: true },

    amount: { type: Number, required: true, min: 0 },
    currency: { type: String, uppercase: true, default: "BDT" },

    status: {
      type: String,
      lowercase: true,
      enum: PAYMENT_STATES,
      default: "initiated",
    },

    sessionKey: { type: String, default: "", select: false },
    gatewayPageUrl: { type: String, default: "" },

    valId: { type: String, default: "" },
    bankTranId: { type: String, default: "" },
    cardType: { type: String, default: "" },
    cardIssuer: { type: String, default: "" },
    riskLevel: { type: String, default: "" },
    riskTitle: { type: String, default: "" },
    validatedAmount: { type: Number, default: null },

    storeAmount: { type: Number, default: null },

    settledBy: {
      type: String,
      enum: [...PAYMENT_CALLBACK_SOURCES, null],
      default: null,
    },

    duplicate: { type: Boolean, default: false },

    failedReason: { type: String, default: "" },
    callbacks: { type: [paymentCallbackSchema], default: [] },

    initiatedAt: { type: Date, default: Date.now },
    verifiedAt: { type: Date, default: null },
    paidAt: { type: Date, default: null },
    failedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ tranId: 1 }, { unique: true });

paymentSchema.index(
  { valId: 1 },
  { unique: true, partialFilterExpression: { valId: { $gt: "" } } },
);

paymentSchema.index({ order: 1, createdAt: -1 });
paymentSchema.index({ user: 1, createdAt: -1 });
paymentSchema.index({ status: 1, createdAt: -1 });
paymentSchema.index({ invoice: 1 });
paymentSchema.index(
  { bankTranId: 1 },
  { partialFilterExpression: { bankTranId: { $gt: "" } } },
);

export const Payment = model<TPayment>("Payment", paymentSchema);
