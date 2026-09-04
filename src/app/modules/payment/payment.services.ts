import httpStatus from "http-status";
import { QueryFilter, Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { logger } from "../../shared/logger";
import { TAuthUser } from "../auth/auth.interface";
import { ONLINE_PAYMENT_METHODS } from "../order/order.constant";
import { TOrder } from "../order/order.interface";
import { Order } from "../order/order.model";
import { orderServices } from "../order/order.services";
import { badRequest, parseDate } from "../order/order.utils";
import {
  PAYMENT_CALLBACK_LOG_MAX,
  PAYMENT_FALLBACK_EMAIL,
  PAYMENT_FALLBACK_POSTCODE,
  PAYMENT_LIST_LIMIT_MAX,
  PAYMENT_OPEN_STATES,
  PAYMENT_PROVIDERS,
  PAYMENT_QUERY_CONTROL_KEYS,
  PAYMENT_STATES,
  SSL_MIN_AMOUNT,
  SSL_VALID_STATES,
} from "./payment.constant";
import { TSslValidationResponse, sslGateway } from "./payment.gateway";
import {
  TInitPayment,
  TInitPaymentResult,
  TPayment,
  TPaymentCallbackEntry,
  TPaymentCallbackSource,
  TPaymentPopulated,
  TPaymentProvider,
  TPaymentState,
  TSettleOutcome,
  TSettleState,
} from "./payment.interface";
import { Payment } from "./payment.model";
import {
  mismatchReason,
  newTranId,
  readString,
  refId,
  toPaymentView,
} from "./payment.utils";

const paymentNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Payment not found");

const STAFF_POPULATE = [
  { path: "order", select: "invoice total status paymentStatus paymentMethod" },
  { path: "user", select: "name email phone" },
];

const numberOrNull = (value: unknown): number | null => {
  const parsed = Number(value);

  return Number.isFinite(parsed) ? parsed : null;
};

const asSettleState = (state: TPaymentState): TSettleState => {
  switch (state) {
    case "paid":
      return "paid";
    case "failed":
      return "failed";
    case "cancelled":
      return "cancelled";
    case "mismatched":
      return "mismatched";
    default:
      return "pending";
  }
};

const outcome = (
  state: TSettleState,
  orderId: string | null,
  extra: Partial<TSettleOutcome> = {},
): TSettleOutcome => ({
  state,
  orderId,
  transitioned: false,
  retryable: false,
  ...extra,
});

/* -------------------------------------------------------------------------- */
/* Init                                                                        */
/* -------------------------------------------------------------------------- */

const initPayment = async (
  caller: TAuthUser,
  payload: TInitPayment,
): Promise<TInitPaymentResult> => {
  const order = await Order.findOne({
    _id: new Types.ObjectId(payload.orderId),
    user: caller._id,
  }).lean<TOrder | null>();

  if (!order) {
    throw new AppError(httpStatus.NOT_FOUND, "Order not found");
  }

  if (
    !(ONLINE_PAYMENT_METHODS as readonly string[]).includes(order.paymentMethod)
  ) {
    throw badRequest("That order is not paid online", "paymentMethod");
  }

  if (order.status === "cancelled") {
    throw badRequest("That order was cancelled", "status");
  }

  if (order.paymentStatus !== "pending") {
    throw badRequest(
      `That order's payment is already ${order.paymentStatus}`,
      "paymentStatus",
    );
  }

  if (order.total < SSL_MIN_AMOUNT) {
    throw badRequest(
      `Online payment needs at least Tk ${SSL_MIN_AMOUNT}`,
      "total",
    );
  }

  const payment = await Payment.create({
    order: order._id,
    user: order.user,
    invoice: order.invoice,
    provider: "sslcommerz",
    tranId: newTranId(),
    amount: order.total,
    currency: "BDT",
    status: "initiated",
    initiatedAt: new Date(),
  });

  const customerEmail =
    order.address.email || caller.email || PAYMENT_FALLBACK_EMAIL;

  const session = await sslGateway.createSession(
    {
      ...order,
      address: {
        ...order.address,
        zipCode: order.address.zipCode || PAYMENT_FALLBACK_POSTCODE,
      },
    },
    payment,
    customerEmail,
  );

  const gatewayPageUrl =
    session.GatewayPageURL || session.redirectGatewayURL || "";

  if (session.status !== "SUCCESS" || !gatewayPageUrl) {
    const reason = session.failedreason || "the gateway gave no reason";

    await Payment.updateOne(
      { _id: payment._id },
      {
        $set: {
          status: "failed",
          failedAt: new Date(),
          failedReason: reason.slice(0, 500),
        },
      },
    );

    logger.error(
      `SSLCommerz refused to open a session for ${payment.tranId}: ${reason}`,
    );

    throw new AppError(
      httpStatus.BAD_GATEWAY,
      "Could not start the payment. Please try again.",
    );
  }

  await Payment.updateOne(
    { _id: payment._id },
    {
      $set: {
        status: "pending",
        sessionKey: session.sessionkey || "",
        gatewayPageUrl,
      },
    },
  );

  return {
    paymentId: payment._id.toString(),
    orderId: order._id.toString(),
    invoice: order.invoice,
    tranId: payment.tranId,
    amount: payment.amount,
    currency: payment.currency,
    gatewayPageUrl,
  };
};

/* -------------------------------------------------------------------------- */
/* Settle                                                                      */
/* -------------------------------------------------------------------------- */

const recordCallback = async (
  id: Types.ObjectId,
  entry: TPaymentCallbackEntry,
): Promise<void> => {
  await Payment.updateOne(
    { _id: id },
    {
      $push: {
        callbacks: { $each: [entry], $slice: -PAYMENT_CALLBACK_LOG_MAX },
      },
    },
  );
};

const claim = async (
  payment: TPayment,
  set: Record<string, unknown>,
): Promise<TPayment | null> =>
  Payment.findOneAndUpdate(
    { _id: payment._id, status: { $in: [...PAYMENT_OPEN_STATES] } },
    { $set: set },
    { new: true },
  ).lean<TPayment | null>();

const alreadySettled = async (
  payment: TPayment,
  orderId: string,
): Promise<TSettleOutcome> => {
  const current = await Payment.findById(payment._id).lean<TPayment | null>();

  return outcome(asSettleState(current?.status ?? payment.status), orderId);
};

const settleTerminal = async (
  payment: TPayment,
  state: "failed" | "cancelled",
  reason: string,
  source: TPaymentCallbackSource,
): Promise<TSettleOutcome> => {
  const orderId = refId(payment.order);

  const won = await claim(payment, {
    status: state,
    settledBy: source,
    failedAt: new Date(),
    ...(reason ? { failedReason: reason.slice(0, 500) } : {}),
  });

  if (!won) {
    return alreadySettled(payment, orderId);
  }

  return outcome(state, orderId, { transitioned: true });
};

const settleMismatched = async (
  payment: TPayment,
  validation: TSslValidationResponse,
  reason: string,
  source: TPaymentCallbackSource,
): Promise<TSettleOutcome> => {
  const orderId = refId(payment.order);
  const valId = readString(validation as Record<string, unknown>, "val_id");

  const won = await claim(payment, {
    status: "mismatched",
    settledBy: source,
    verifiedAt: new Date(),
    validatedAmount: numberOrNull(validation.amount),
    storeAmount: numberOrNull(validation.store_amount),
    failedReason: `Validator disagreed on ${reason} (val_id ${valId || "unknown"})`,
  });

  logger.error(
    `Payment ${payment.tranId} validated but ${reason} did not match: gateway said ` +
      `tran_id=${validation.tran_id} amount=${validation.amount} currency=${validation.currency}, ` +
      `we asked for tran_id=${payment.tranId} amount=${payment.amount} currency=${payment.currency}. ` +
      `Order ${orderId} left unpaid for review.`,
  );

  if (!won) {
    return alreadySettled(payment, orderId);
  }

  return outcome("mismatched", orderId, { transitioned: true });
};

const settlePaid = async (
  payment: TPayment,
  validation: TSslValidationResponse,
  source: TPaymentCallbackSource,
): Promise<TSettleOutcome> => {
  const orderId = refId(payment.order);
  const now = new Date();
  const params = validation as Record<string, unknown>;

  const won = await claim(payment, {
    status: "paid",
    settledBy: source,
    verifiedAt: now,
    paidAt: now,
    valId: readString(params, "val_id"),
    bankTranId: readString(params, "bank_tran_id"),
    cardType: readString(params, "card_type"),
    cardIssuer: readString(params, "card_issuer"),
    riskLevel: readString(params, "risk_level"),
    riskTitle: readString(params, "risk_title"),
    validatedAmount: numberOrNull(validation.amount),
    storeAmount: numberOrNull(validation.store_amount),
  });

  if (!won) {
    return alreadySettled(payment, orderId);
  }

  if (won.riskLevel === "1") {
    logger.warn(
      `SSLCommerz flagged payment ${payment.tranId} as risky: ${won.riskTitle || "no title"}.`,
    );
  }

  const order = await orderServices.markPaidByGateway(payment.order, now);

  if (!order) {
    await Payment.updateOne(
      { _id: payment._id },
      { $set: { duplicate: true } },
    );

    logger.error(
      `Payment ${payment.tranId} settled but order ${orderId} did not transition ` +
        `(bank_tran_id=${won.bankTranId || "unknown"}). Possible double collection — needs review.`,
    );

    return outcome("paid", orderId);
  }

  return outcome("paid", orderId, { transitioned: true });
};

const settle = async (
  params: Record<string, unknown>,
  source: TPaymentCallbackSource,
  ip: string,
): Promise<TSettleOutcome> => {
  const tranId = readString(params, "tran_id");

  if (!tranId) {
    logger.warn(`An SSLCommerz ${source} callback arrived with no tran_id.`);

    return outcome("unknown", null);
  }

  const payment = await Payment.findOne({ tranId }).lean<TPayment | null>();

  if (!payment) {
    logger.warn(
      `An SSLCommerz ${source} callback named an unknown tran_id ${tranId}.`,
    );

    return outcome("unknown", null);
  }

  const orderId = refId(payment.order);

  await recordCallback(payment._id, {
    source,
    at: new Date(),
    gatewayStatus: readString(params, "status"),
    valId: readString(params, "val_id"),
    ip,
  });

  if (source === "cancel") {
    return settleTerminal(payment, "cancelled", "", source);
  }

  if (source === "fail") {
    return settleTerminal(
      payment,
      "failed",
      readString(params, "error") || readString(params, "status"),
      source,
    );
  }

  const valId = readString(params, "val_id");

  if (!valId) {
    return outcome("pending", orderId);
  }

  let validation: TSslValidationResponse;

  try {
    validation = await sslGateway.validate(valId);
  } catch (error) {
    logger.error(
      `Could not reach the SSLCommerz validator for ${tranId}: ${error}`,
    );

    return outcome("pending", orderId, { retryable: source === "ipn" });
  }

  const status = readString(
    validation as Record<string, unknown>,
    "status",
  ).toUpperCase();

  if (status === "FAILED") {
    return settleTerminal(
      payment,
      "failed",
      readString(validation as Record<string, unknown>, "error") || "FAILED",
      source,
    );
  }

  if (!(SSL_VALID_STATES as readonly string[]).includes(status)) {
    logger.warn(
      `The SSLCommerz validator returned "${status || "nothing"}" for ${tranId} ` +
        `(${source}); the payment is left untouched.`,
    );

    return outcome("pending", orderId);
  }

  const reason = mismatchReason(payment, validation);

  return reason
    ? settleMismatched(payment, validation, reason, source)
    : settlePaid(payment, validation, source);
};

const settleFromCallback = async (
  params: Record<string, unknown>,
  source: TPaymentCallbackSource,
  ip: string,
): Promise<TSettleOutcome> => {
  try {
    return await settle(params, source, ip);
  } catch (error) {
    logger.error(
      `An SSLCommerz ${source} callback could not be settled: ${error}`,
    );

    return outcome("error", null, { retryable: source === "ipn" });
  }
};

/* -------------------------------------------------------------------------- */
/* Reads                                                                       */
/* -------------------------------------------------------------------------- */

const buildFilter = (query: Record<string, unknown>): QueryFilter<TPayment> => {
  const filter: QueryFilter<TPayment> = {};

  const status = String(query.status ?? "");
  if ((PAYMENT_STATES as readonly string[]).includes(status)) {
    filter.status = status as TPaymentState;
  }

  const provider = String(query.provider ?? "");
  if ((PAYMENT_PROVIDERS as readonly string[]).includes(provider)) {
    filter.provider = provider as TPaymentProvider;
  }

  const orderId = typeof query.orderId === "string" ? query.orderId : "";
  if (Types.ObjectId.isValid(orderId)) {
    filter.order = new Types.ObjectId(orderId);
  }

  const userId = typeof query.userId === "string" ? query.userId : "";
  if (Types.ObjectId.isValid(userId)) {
    filter.user = new Types.ObjectId(userId);
  }

  const from = parseDate(query.from, false);
  const to = parseDate(query.to, true);

  if (from || to) {
    filter.createdAt = {
      ...(from ? { $gte: from } : {}),
      ...(to ? { $lte: to } : {}),
    };
  }

  const searchTerm =
    typeof query.searchTerm === "string" ? query.searchTerm.trim() : "";

  if (searchTerm) {
    const invoice = Number(searchTerm);

    filter.$or = [
      { tranId: searchTerm },
      { valId: searchTerm },
      { bankTranId: searchTerm },
      ...(Number.isInteger(invoice) ? [{ invoice }] : []),
    ];
  }

  return filter;
};

const paginate = async (
  filter: QueryFilter<TPayment>,
  query: Record<string, unknown>,
  populate: boolean,
): Promise<{ data: TPaymentPopulated[]; pagination: TPagination }> => {
  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    PAYMENT_LIST_LIMIT_MAX,
    Math.max(1, Number(query.limit) || 10),
  );

  const paymentQuery = new QueryBuilder(Payment.find(filter), {
    ...query,
    page,
    limit,
  })
    .filter(PAYMENT_QUERY_CONTROL_KEYS)
    .sort();

  await paymentQuery.paginate();
  paymentQuery.fields();

  const data = await paymentQuery.modelQuery
    .populate(populate ? STAFF_POPULATE : [])
    .lean<TPaymentPopulated[]>();

  return {
    data,
    pagination: {
      page,
      limit,
      total: paymentQuery.total,
      totalPage: Math.ceil(paymentQuery.total / limit),
    },
  };
};

const getMyPayments = (caller: TAuthUser, query: Record<string, unknown>) =>
  paginate({ ...buildFilter(query), user: caller._id }, query, false);

const getMyPaymentForOrder = async (
  caller: TAuthUser,
  orderId: string,
): Promise<TPayment> => {
  const payment = await Payment.findOne({
    order: new Types.ObjectId(orderId),
    user: caller._id,
  })
    .sort({ createdAt: -1 })
    .lean<TPayment | null>();

  if (!payment) {
    throw paymentNotFound();
  }

  return payment;
};

const listPayments = (query: Record<string, unknown>) =>
  paginate(buildFilter(query), query, true);

const getPayment = async (id: string) => {
  const payment = await Payment.findById(new Types.ObjectId(id))
    .populate(STAFF_POPULATE)
    .lean<TPaymentPopulated | null>();

  if (!payment) {
    throw paymentNotFound();
  }

  return toPaymentView(payment);
};

export const paymentServices = {
  initPayment,
  settleFromCallback,
  getMyPayments,
  getMyPaymentForOrder,
  listPayments,
  getPayment,
};
