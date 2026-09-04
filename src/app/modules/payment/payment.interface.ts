import { Types } from "mongoose";

import {
  PAYMENT_CALLBACK_SOURCES,
  PAYMENT_PROVIDERS,
  PAYMENT_SETTLE_STATES,
  PAYMENT_STATES,
} from "./payment.constant";

export type TPaymentProvider = (typeof PAYMENT_PROVIDERS)[number];
export type TPaymentState = (typeof PAYMENT_STATES)[number];
export type TPaymentCallbackSource = (typeof PAYMENT_CALLBACK_SOURCES)[number];
export type TSettleState = (typeof PAYMENT_SETTLE_STATES)[number];

export type TPaymentCallbackEntry = {
  source: TPaymentCallbackSource;
  at: Date;
  gatewayStatus: string;
  valId: string;
  ip: string;
};

export type TPayment = {
  _id: Types.ObjectId;
  order: Types.ObjectId;
  user: Types.ObjectId;
  invoice: number;
  provider: TPaymentProvider;
  tranId: string;
  amount: number;
  currency: string;
  status: TPaymentState;
  sessionKey: string;
  gatewayPageUrl: string;
  valId: string;
  bankTranId: string;
  cardType: string;
  cardIssuer: string;
  riskLevel: string;
  riskTitle: string;
  validatedAmount: number | null;
  storeAmount: number | null;
  settledBy: TPaymentCallbackSource | null;
  duplicate: boolean;
  failedReason: string;
  callbacks: TPaymentCallbackEntry[];
  initiatedAt: Date;
  verifiedAt: Date | null;
  paidAt: Date | null;
  failedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TPaymentRef = Types.ObjectId | { _id: Types.ObjectId };

export type TPaymentPopulated = Omit<TPayment, "order" | "user"> & {
  order: TPaymentRef;
  user: TPaymentRef;
};

export type TInitPayment = {
  orderId: string;
};

export type TInitPaymentResult = {
  paymentId: string;
  orderId: string;
  invoice: number;
  tranId: string;
  amount: number;
  currency: string;
  gatewayPageUrl: string;
};

export type TSettleOutcome = {
  state: TSettleState;
  orderId: string | null;
  transitioned: boolean;
  retryable: boolean;
};

export type TMyPaymentView = {
  id: string;
  orderId: string;
  invoice: number;
  status: TPaymentState;
  amount: number;
  currency: string;
  gatewayPageUrl: string;
  paidAt: Date | null;
  createdAt: Date;
};
