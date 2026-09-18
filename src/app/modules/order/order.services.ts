import httpStatus from "http-status";
import mongoose, { QueryFilter, Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import { OrderPermission, PermissionModule } from "../../constants/permissions";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import {
  queueLowStock,
  queueOrderPlaced,
  queueOrderStatus,
} from "../../queues/orders.queue";
import { roundMoney } from "../../utils/money";
import { hasPermission } from "../../utils/permissions";
import { TAddress } from "../address/address.interface";
import { Address } from "../address/address.model";
import { TAuthUser } from "../auth/auth.interface";
import { TCart } from "../cart/cart.interface";
import { Cart } from "../cart/cart.model";
import { emptyCart, priceCart } from "../cart/cart.services";
import { notify } from "../notification/notification.emit";
import { TOrderCoupon } from "./order.interface";
import { couponServices } from "../coupon/coupon.services";
import { getBaseMoneyFormat } from "../currency/currency.cache";
import { getSettings } from "../settings/settings.cache";
import {
  ORDER_CUSTOMER_CANCELLABLE,
  ORDER_EXPORT_MAX,
  ORDER_LIST_LIMIT_MAX,
  ORDER_QUERY_CONTROL_KEYS,
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SHIPPING_OPTION_KEYS,
} from "./order.constant";
import {
  TCheckoutOptions,
  TOrder,
  TOrderStats,
  TOrderStatus,
  TPaymentMethod,
  TPaymentStatus,
  TPlaceOrder,
} from "./order.interface";
import { Order } from "./order.model";
import {
  assertBasketIsBuyable,
  badRequest,
  decrementStock,
  escapeRegex,
  nextInvoice,
  parseDate,
  resolveShipping,
  restoreStock,
  toOrderItems,
} from "./order.utils";

const orderNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Order not found");

const changedElsewhere = () =>
  new AppError(
    httpStatus.CONFLICT,
    "That order was changed from somewhere else. Please try again.",
  );

const canSeeEveryOrder = (caller: TAuthUser): boolean =>
  hasPermission(caller, PermissionModule.Order, OrderPermission.ViewOrders);

export type TOrderScope = "mine" | "store";

const resolveScope = (
  caller: TAuthUser,
  requested: TOrderScope,
): TOrderScope =>
  requested === "store" && canSeeEveryOrder(caller) ? "store" : "mine";

const STAFF_POPULATE = [{ path: "user", select: "name email phone" }];

const isMissingTransactionSupport = (error: unknown): boolean =>
  error instanceof Error &&
  /Transaction numbers are only allowed on a replica set member or mongos|Transactions are not supported/i.test(
    error.message,
  );

const asPlacementError = (error: unknown): unknown =>
  isMissingTransactionSupport(error)
    ? new AppError(
        httpStatus.INTERNAL_SERVER_ERROR,
        "Placing an order needs a replica-set MongoDB. Point MONGO_URI at Atlas, or run a local single-node replica set.",
      )
    : error;

const fireAndForget = (work: Promise<unknown>): void => {
  void work.catch(() => undefined);
};

const getCheckoutOptions = async (): Promise<TCheckoutOptions> => {
  const { checkout } = await getSettings();

  return {
    shipping: SHIPPING_OPTION_KEYS.filter(
      (key) => checkout.shipping[key]?.enabled,
    ).map((key) => {
      const { label, note, fee, etaDays } = checkout.shipping[key];
      return { key, label, note, fee, etaDays };
    }),
    paymentMethods: PAYMENT_METHODS.filter(
      (method) => checkout.paymentMethods[method]?.enabled,
    ),
    freeDeliveryOver: checkout.freeDeliveryOver,
  };
};

const placeOrder = async (
  user: Types.ObjectId,
  payload: TPlaceOrder,
): Promise<TOrder> => {
  const { checkout } = await getSettings();

  // Read before the transaction: the snapshot only has to be the currency the
  // customer was quoted in, and a rate change mid-checkout is not worth a retry.
  const currency = await getBaseMoneyFormat();

  if (!checkout.paymentMethods[payload.paymentMethod]?.enabled) {
    throw badRequest("That payment method is not available", "paymentMethod");
  }

  const session = await mongoose.startSession();

  let placed: TOrder | undefined;
  let touched: string[] = [];

  try {
    await session.withTransaction(async () => {
      const cart = await Cart.findOne({ user })
        .session(session)
        .lean<TCart | null>();

      const view = await priceCart(cart, session);

      assertBasketIsBuyable(view);

      const address = await Address.findOne({
        _id: new Types.ObjectId(payload.addressId),
        user,
        isDeleted: false,
      })
        .session(session)
        .lean<TAddress | null>();

      if (!address) {
        throw badRequest("That delivery address was not found", "addressId");
      }

      const applied = payload.couponCode
        ? await couponServices.applyCoupon(
            payload.couponCode,
            view.subtotal,
            session,
          )
        : null;

      const discount = applied?.discount ?? 0;

      const coupon: TOrderCoupon | null = applied
        ? {
            coupon: applied.coupon._id,
            code: applied.coupon.couponCode,
            title: applied.coupon.title,
            discountType: applied.coupon.discountType,
            discountValue: applied.coupon.discountValue,
          }
        : null;

      const { fee } = resolveShipping(
        payload.shippingOption,
        view.subtotal - discount,
        checkout,
      );
      const items = toOrderItems(view);

      const [created] = await Order.create(
        [
          {
            invoice: await nextInvoice(session),
            user,
            items,
            address: {
              name: address.name,
              contact: address.contact,
              email: address.email ?? "",
              address: address.address,
              country: address.country,
              city: address.city,
              area: address.area ?? "",
              zipCode: address.zipCode ?? "",
            },
            subtotal: view.subtotal,
            shippingCost: fee,
            discount,
            coupon,
            total: roundMoney(view.subtotal + fee - discount, currency.decimals),
            currency,
            shippingOption: payload.shippingOption,
            paymentMethod: payload.paymentMethod,
            paymentStatus: "pending",
            status: "pending",
            statusHistory: [{ status: "pending", at: new Date(), by: null }],
          },
        ],
        { session },
      );

      await decrementStock(items, session);
      await emptyCart(user, session);

      placed = created.toObject<TOrder>();
      touched = [...new Set(items.map((item) => item.product.toString()))];
    });
  } catch (error) {
    throw asPlacementError(error);
  } finally {
    await session.endSession();
  }

  if (!placed) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "The order could not be placed",
    );
  }

  fireAndForget(
    Promise.all([
      queueOrderPlaced({ orderId: placed._id.toString() }),
      queueLowStock({ productIds: touched }),
    ]),
  );

  notify({
    event: "order.placed",
    orderId: placed._id.toString(),
    userId: placed.user.toString(),
    invoice: placed.invoice,
    total: placed.total,
    actorId: user.toString(),
  });

  return placed;
};

const buildFilter = (
  caller: TAuthUser,
  query: Record<string, unknown>,
  scope: TOrderScope,
): QueryFilter<TOrder> => {
  const isStaff = scope === "store";
  const filter: QueryFilter<TOrder> = {};

  if (isStaff) {
    const userId = typeof query.userId === "string" ? query.userId : "";

    if (Types.ObjectId.isValid(userId)) {
      filter.user = new Types.ObjectId(userId);
    }
  } else {
    filter.user = caller._id;
  }

  const status = String(query.status ?? "");
  if ((ORDER_STATUS as readonly string[]).includes(status)) {
    filter.status = status as TOrderStatus;
  }

  const paymentStatus = String(query.paymentStatus ?? "");
  if ((PAYMENT_STATUSES as readonly string[]).includes(paymentStatus)) {
    filter.paymentStatus = paymentStatus as TPaymentStatus;
  }

  const paymentMethod = String(query.paymentMethod ?? "");
  if ((PAYMENT_METHODS as readonly string[]).includes(paymentMethod)) {
    filter.paymentMethod = paymentMethod as TPaymentMethod;
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
    const clauses: QueryFilter<TOrder>[] = [];

    const invoice = Number(searchTerm);
    if (Number.isInteger(invoice)) {
      clauses.push({ invoice });
    }

    if (isStaff) {
      const pattern = new RegExp(escapeRegex(searchTerm), "i");
      clauses.push({ "address.name": pattern }, { "address.contact": pattern });
    }

    filter.$or = clauses.length > 0 ? clauses : [{ invoice: -1 }];
  }

  return filter;
};

const listOrders = async (
  caller: TAuthUser,
  query: Record<string, unknown>,
  requested: TOrderScope,
): Promise<{ data: TOrder[]; pagination: TPagination }> => {
  const scope = resolveScope(caller, requested);
  const isStaff = scope === "store";

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    ORDER_LIST_LIMIT_MAX,
    Math.max(1, Number(query.limit) || 10),
  );

  const orderQuery = new QueryBuilder(
    Order.find(buildFilter(caller, query, scope)),
    { ...query, page, limit },
  )
    .filter(ORDER_QUERY_CONTROL_KEYS)
    .sort();

  await orderQuery.paginate();
  orderQuery.fields();

  const data = await orderQuery.modelQuery
    .populate(isStaff ? STAFF_POPULATE : [])
    .lean<TOrder[]>();

  return {
    data,
    pagination: {
      page,
      limit,
      total: orderQuery.total,
      totalPage: Math.ceil(orderQuery.total / limit),
    },
  };
};

const exportOrders = async (
  caller: TAuthUser,
  query: Record<string, unknown>,
  requested: TOrderScope,
) => {
  const filter = buildFilter(caller, query, resolveScope(caller, requested));
  const total = await Order.countDocuments(filter);

  if (total > ORDER_EXPORT_MAX) {
    throw badRequest(
      `That is ${total.toLocaleString("en-BD")} orders, and at most ${ORDER_EXPORT_MAX.toLocaleString("en-BD")} can be exported at once. Narrow it with from/to or a status filter.`,
      "from",
    );
  }

  return {
    total,
    cursor: Order.find(filter).sort({ createdAt: -1 }).lean<TOrder>().cursor(),
  };
};

const getOrder = async (caller: TAuthUser, id: string): Promise<TOrder> => {
  const isStaff = canSeeEveryOrder(caller);

  const order = await Order.findOne({
    _id: new Types.ObjectId(id),
    ...(isStaff ? {} : { user: caller._id }),
  })
    .populate(isStaff ? STAFF_POPULATE : [])
    .lean<TOrder | null>();

  if (!order) {
    throw orderNotFound();
  }

  return order;
};

const getStats = async (
  caller: TAuthUser,
  requested: TOrderScope,
): Promise<TOrderStats> => {
  const isStaff = resolveScope(caller, requested) === "store";

  const rows = await Order.aggregate<{ _id: TOrderStatus; count: number }>([
    { $match: isStaff ? {} : { user: caller._id } },
    { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);

  const counts = Object.fromEntries(
    ORDER_STATUS.map((status) => [status, 0]),
  ) as Record<TOrderStatus, number>;

  let total = 0;

  for (const row of rows) {
    counts[row._id] = row.count;
    total += row.count;
  }

  return { ...counts, total };
};

const cancelOrder = async (caller: TAuthUser, id: string): Promise<TOrder> => {
  const canCancelAny = hasPermission(
    caller,
    PermissionModule.Order,
    OrderPermission.CancelOrder,
  );

  const orderId = new Types.ObjectId(id);
  const scope = canCancelAny ? {} : { user: caller._id };

  const existing = await Order.findOne({
    _id: orderId,
    ...scope,
  }).lean<TOrder | null>();

  if (!existing) {
    throw orderNotFound();
  }

  if (existing.status === "cancelled") {
    throw badRequest("That order is already cancelled", "status");
  }

  const cancellable = canCancelAny
    ? existing.status !== "delivered"
    : ORDER_CUSTOMER_CANCELLABLE.includes(existing.status);

  if (!cancellable) {
    throw badRequest(
      `An order cannot be cancelled once it is ${existing.status}`,
      "status",
    );
  }

  const session = await mongoose.startSession();
  let cancelled: TOrder | undefined;

  try {
    await session.withTransaction(async () => {
      const now = new Date();

      const updated = await Order.findOneAndUpdate(
        {
          _id: orderId,
          ...scope,
          status: existing.status,
          stockRestoredAt: null,
        },
        {
          $set: {
            status: "cancelled",
            cancelledAt: now,
            stockRestoredAt: now,
          },
          $push: {
            statusHistory: { status: "cancelled", at: now, by: caller._id },
          },
        },
        { new: true, session },
      ).lean<TOrder | null>();

      if (!updated) {
        throw changedElsewhere();
      }

      await restoreStock(existing.items, session);

      cancelled = updated;
    });
  } catch (error) {
    throw asPlacementError(error);
  } finally {
    await session.endSession();
  }

  if (!cancelled) {
    throw changedElsewhere();
  }

  fireAndForget(queueOrderStatus({ orderId: id, status: "cancelled" }));

  notify({
    event: "order.cancelled",
    orderId: cancelled._id.toString(),
    userId: cancelled.user.toString(),
    invoice: cancelled.invoice,
    actorId: caller._id.toString(),
  });

  return cancelled;
};

const updateStatus = async (
  caller: TAuthUser,
  id: string,
  status: TOrderStatus,
): Promise<TOrder> => {
  const orderId = new Types.ObjectId(id);
  const existing = await Order.findById(orderId).lean<TOrder | null>();

  if (!existing) {
    throw orderNotFound();
  }

  if (status === existing.status) {
    throw badRequest(`That order is already ${status}`, "status");
  }

  const next = ORDER_STATUS_FLOW[existing.status];

  if (!next.includes(status)) {
    throw badRequest(
      next.length === 0
        ? `An order that is ${existing.status} cannot change status again`
        : `An order that is ${existing.status} can only move to ${next.join(" or ")}`,
      "status",
    );
  }

  if (status === "cancelled") {
    return cancelOrder(caller, id);
  }

  const now = new Date();
  const set: Record<string, unknown> = { status };

  if (status === "delivered") {
    set.deliveredAt = now;

    if (
      existing.paymentMethod === "cod" &&
      existing.paymentStatus === "pending"
    ) {
      set.paymentStatus = "paid";
      set.paidAt = now;
    }
  }

  const advanced = await Order.findOneAndUpdate(
    { _id: orderId, status: existing.status },
    {
      $set: set,
      $push: { statusHistory: { status, at: now, by: caller._id } },
    },
    { new: true },
  ).lean<TOrder | null>();

  if (!advanced) {
    throw changedElsewhere();
  }

  fireAndForget(queueOrderStatus({ orderId: id, status }));

  notify({
    event: "order.status",
    orderId: advanced._id.toString(),
    userId: advanced.user.toString(),
    invoice: advanced.invoice,
    status: advanced.status,
    actorId: caller._id.toString(),
  });

  return advanced;
};

const updatePaymentStatus = async (
  caller: TAuthUser,
  id: string,
  paymentStatus: TPaymentStatus,
): Promise<TOrder> => {
  const set: Record<string, unknown> = { paymentStatus };

  if (paymentStatus === "paid") {
    set.paidAt = new Date();
  }

  const updated = await Order.findOneAndUpdate(
    { _id: new Types.ObjectId(id) },
    { $set: set },
    { new: true },
  ).lean<TOrder | null>();

  if (!updated) {
    throw orderNotFound();
  }

  notify({
    event: "order.payment",
    orderId: updated._id.toString(),
    userId: updated.user.toString(),
    invoice: updated.invoice,
    paymentStatus: updated.paymentStatus,
    actorId: caller._id.toString(),
  });

  return updated;
};

const markPaidByGateway = async (
  orderId: Types.ObjectId,
  paidAt: Date,
): Promise<TOrder | null> => {
  const updated = await Order.findOneAndUpdate(
    { _id: orderId, paymentStatus: "pending", status: { $ne: "cancelled" } },
    { $set: { paymentStatus: "paid", paidAt } },
    { new: true },
  ).lean<TOrder | null>();

  if (!updated) {
    return null;
  }

  notify({
    event: "order.payment",
    orderId: updated._id.toString(),
    userId: updated.user.toString(),
    invoice: updated.invoice,
    paymentStatus: "paid",
  });

  return updated;
};

export const orderServices = {
  getCheckoutOptions,
  placeOrder,
  listOrders,
  exportOrders,
  getOrder,
  getStats,
  cancelOrder,
  updateStatus,
  updatePaymentStatus,
  markPaidByGateway,
};
