import { randomBytes } from "crypto";
import { NextFunction, Request, RequestHandler, Response } from "express";
import httpStatus from "http-status";

import config from "../../config";
import AppError from "../../errors/AppError";
import { logger } from "../../shared/logger";
import { TSslValidationResponse } from "./payment.gateway";
import { PAYMENT_AMOUNT_EPSILON } from "./payment.constant";
import {
  TPayment,
  TPaymentPopulated,
  TPaymentRef,
  TSettleOutcome,
} from "./payment.interface";

export const newTranId = (): string =>
  `BB${Date.now().toString(36).toUpperCase()}${randomBytes(8).toString("hex").toUpperCase()}`;

export const readString = (
  params: Record<string, unknown>,
  key: string,
): string =>
  typeof params[key] === "string" ? (params[key] as string).trim() : "";

export const callbackParams = (req: Request): Record<string, unknown> => ({
  ...(req.query as Record<string, unknown>),
  ...((req.body as Record<string, unknown>) ?? {}),
});

const normalizeIp = (raw: string): string =>
  raw.trim().replace(/^::ffff:/i, "");

export const clientIp = (req: Request): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const first = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(
    ",",
  )[0];

  return normalizeIp(first || req.socket.remoteAddress || "");
};

export const ipnAllowlist: RequestHandler = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (config.ssl_ipn_allow_any_ip) {
    return next();
  }

  const ip = clientIp(req);

  if (config.ssl_ipn_allowed_ips.includes(ip)) {
    return next();
  }

  logger.warn(
    `Rejected an SSLCommerz IPN from ${ip || "an unknown address"}. ` +
      `Add it to SSL_IPN_ALLOWED_IPS if it is genuinely the gateway.`,
  );

  return next(new AppError(httpStatus.FORBIDDEN, "IPN source not allowed"));
};

export const refId = (ref: TPaymentRef): string =>
  ref && typeof ref === "object" && "_id" in ref
    ? String(ref._id)
    : String(ref);

export const mismatchReason = (
  payment: TPayment,
  validation: TSslValidationResponse,
): string | null => {
  if (
    readString(validation as Record<string, unknown>, "tran_id") !==
    payment.tranId
  ) {
    return "tran_id";
  }

  const currency = readString(
    validation as Record<string, unknown>,
    "currency",
  ).toUpperCase();

  if (currency !== payment.currency.toUpperCase()) {
    return "currency";
  }

  const amount = Number(validation.amount);

  if (!Number.isFinite(amount)) {
    return "amount";
  }

  if (Math.abs(amount - payment.amount) > PAYMENT_AMOUNT_EPSILON) {
    return "amount";
  }

  return null;
};

const RETURN_QUERY: Record<string, string> = {
  paid: "success",
  failed: "failed",
  cancelled: "cancelled",
  pending: "pending",
  mismatched: "review",
};

export const clientReturnUrl = (outcome: TSettleOutcome): string => {
  const status = RETURN_QUERY[outcome.state];

  if (!status || !outcome.orderId) {
    return new URL("/checkout?payment=error", config.client_url).toString();
  }

  return new URL(
    `/order/${outcome.orderId}?payment=${status}`,
    config.client_url,
  ).toString();
};

export const toMyPaymentView = (payment: TPaymentPopulated) => ({
  id: payment._id.toString(),
  orderId: refId(payment.order),
  invoice: payment.invoice,
  status: payment.status,
  amount: payment.amount,
  currency: payment.currency,
  gatewayPageUrl: payment.status === "pending" ? payment.gatewayPageUrl : "",
  paidAt: payment.paidAt,
  createdAt: payment.createdAt,
});

export const toPaymentView = (payment: TPaymentPopulated) => ({
  id: payment._id.toString(),
  order: payment.order,
  user: payment.user,
  orderId: refId(payment.order),
  invoice: payment.invoice,
  provider: payment.provider,
  tranId: payment.tranId,
  amount: payment.amount,
  currency: payment.currency,
  status: payment.status,
  valId: payment.valId,
  bankTranId: payment.bankTranId,
  cardType: payment.cardType,
  cardIssuer: payment.cardIssuer,
  riskLevel: payment.riskLevel,
  riskTitle: payment.riskTitle,
  validatedAmount: payment.validatedAmount,
  storeAmount: payment.storeAmount,
  settledBy: payment.settledBy,
  duplicate: payment.duplicate,
  failedReason: payment.failedReason,
  callbacks: payment.callbacks,
  initiatedAt: payment.initiatedAt,
  verifiedAt: payment.verifiedAt,
  paidAt: payment.paidAt,
  failedAt: payment.failedAt,
  createdAt: payment.createdAt,
  updatedAt: payment.updatedAt,
});
