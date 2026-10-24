import {
  ContactPermission,
  OrderPermission,
  PermissionModule,
  ProductPermission,
} from "../../constants/permissions";
import { DHAKA_TIME_ZONE } from "../../utils/dhakaDate";
import { roundMoney } from "../../utils/money";
import { hasPermission } from "../../utils/permissions";
import { TAuthUser } from "../auth/auth.interface";
import { Contact } from "../contact/contact.model";
import { ORDER_STATUS, PAYMENT_METHODS } from "../order/order.constant";
import { Order } from "../order/order.model";
import { Product } from "../product/product.model";
import { UserType } from "../users/user.interface";
import { User } from "../users/user.model";
import {
  LOW_STOCK_THRESHOLD,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  TOP_CATEGORIES_LIMIT,
  TOP_CITIES_LIMIT,
  TOP_PRODUCTS_LIMIT,
} from "./dashboard.constant";
import {
  TCatalogResponse,
  TCategory,
  TCommercialResponse,
  TGrowthResponse,
  TOperationsResponse,
  TOperationsTile,
  TScalar,
  TSeries,
  TTopProduct,
} from "./dashboard.interface";
import {
  fillSeries,
  resolveRange,
  toCountMap,
  TResolvedRange,
} from "./dashboard.utils";

type TWindow = { start: Date; endExclusive: Date };

const currentWindow = (range: TResolvedRange): TWindow => ({
  start: range.fromAt,
  endExclusive: range.toAtExclusive,
});

const previousWindow = (range: TResolvedRange): TWindow => ({
  start: range.prevFromAt,
  endExclusive: range.prevToAtExclusive,
});

const within = (window: TWindow) => ({
  $gte: window.start,
  $lt: window.endExclusive,
});

const rangeWindow = (range: TResolvedRange) => within(currentWindow(range));

const scalar = (value: number, previous: number): TScalar => ({
  value,
  previous,
});

const dayBucket = (field: string) => ({
  $dateToString: { format: "%Y-%m-%d", date: field, timezone: DHAKA_TIME_ZONE },
});

const NOT_CANCELLED = { status: { $ne: "cancelled" as const } };

const paidRevenueIn = async (
  window: TWindow,
): Promise<{ total: number; count: number }> => {
  const [row] = await Order.aggregate<{ total: number; count: number }>([
    {
      $match: {
        ...NOT_CANCELLED,
        paymentStatus: "paid",
        paidAt: within(window),
      },
    },
    { $group: { _id: null, total: { $sum: "$total" }, count: { $sum: 1 } } },
  ]);

  return { total: roundMoney(row?.total ?? 0), count: row?.count ?? 0 };
};

const placedOrdersIn = (window: TWindow): Promise<number> =>
  Order.countDocuments({ ...NOT_CANCELLED, createdAt: within(window) });

const cancelledOrdersIn = (window: TWindow): Promise<number> =>
  Order.countDocuments({ status: "cancelled", cancelledAt: within(window) });

const receivablesOutstanding = async (): Promise<number> => {
  const [row] = await Order.aggregate<{ total: number }>([
    { $match: { ...NOT_CANCELLED, paymentStatus: "pending" } },
    { $group: { _id: null, total: { $sum: "$total" } } },
  ]);
  return roundMoney(row?.total ?? 0);
};

const revenueSeriesIn = async (range: TResolvedRange): Promise<TSeries> => {
  const rows = await Order.aggregate<{ _id: string; value: number }>([
    {
      $match: {
        ...NOT_CANCELLED,
        paymentStatus: "paid",
        paidAt: rangeWindow(range),
      },
    },
    { $group: { _id: dayBucket("$paidAt"), value: { $sum: "$total" } } },
  ]);

  const series = fillSeries(toCountMap(rows), range);
  return {
    ...series,
    points: series.points.map((point) => ({
      ...point,
      value: roundMoney(point.value),
    })),
  };
};

const orderSeriesIn = async (range: TResolvedRange): Promise<TSeries> => {
  const rows = await Order.aggregate<{ _id: string; value: number }>([
    { $match: { ...NOT_CANCELLED, createdAt: rangeWindow(range) } },
    { $group: { _id: dayBucket("$createdAt"), value: { $sum: 1 } } },
  ]);

  return fillSeries(toCountMap(rows), range);
};

const groupCountIn = async (
  range: TResolvedRange,
  field: string,
  match: Record<string, unknown> = NOT_CANCELLED,
): Promise<Map<string, number>> => {
  const rows = await Order.aggregate<{ _id: string; value: number }>([
    { $match: { ...match, createdAt: rangeWindow(range) } },
    { $group: { _id: `$${field}`, value: { $sum: 1 } } },
  ]);
  return toCountMap(rows);
};

const paymentMixIn = async (range: TResolvedRange): Promise<TCategory[]> => {
  const counts = await groupCountIn(range, "paymentMethod");

  return PAYMENT_METHODS.map((key) => ({
    key,
    label: PAYMENT_METHOD_LABELS[key] ?? key,
    value: counts.get(key) ?? 0,
  }));
};

const statusFunnelIn = async (range: TResolvedRange): Promise<TCategory[]> => {
  const counts = await groupCountIn(range, "status", {});

  return ORDER_STATUS.map((key) => ({
    key,
    label: ORDER_STATUS_LABELS[key] ?? key,
    value: counts.get(key) ?? 0,
  }));
};

const topProductsIn = async (range: TResolvedRange): Promise<TTopProduct[]> => {
  const rows = await Order.aggregate<{
    _id: string;
    label: string;
    value: number;
    quantity: number;
  }>([
    {
      $match: {
        ...NOT_CANCELLED,
        paymentStatus: "paid",
        paidAt: rangeWindow(range),
      },
    },
    { $unwind: "$items" },
    {
      $group: {
        _id: { $toString: "$items.product" },
        label: { $first: "$items.title" },
        value: { $sum: "$items.lineTotal" },
        quantity: { $sum: "$items.qty" },
      },
    },
    { $sort: { value: -1 } },
    { $limit: TOP_PRODUCTS_LIMIT },
  ]);

  return rows.map((row) => ({
    key: row._id,
    label: row.label,
    value: roundMoney(row.value),
    quantity: row.quantity,
  }));
};

const ordersByCityIn = async (range: TResolvedRange): Promise<TCategory[]> => {
  const rows = await Order.aggregate<{ _id: string | null; value: number }>([
    { $match: { ...NOT_CANCELLED, createdAt: rangeWindow(range) } },
    { $group: { _id: "$address.city", value: { $sum: 1 } } },
    { $sort: { value: -1 } },
    { $limit: TOP_CITIES_LIMIT },
  ]);

  return rows.map((row) => ({
    key: row._id || "unknown",
    label: row._id || "Unknown",
    value: row.value,
  }));
};

const average = (money: number, count: number): number =>
  count === 0 ? 0 : roundMoney(money / count);

const getCommercial = async (
  from?: string,
  to?: string,
): Promise<TCommercialResponse> => {
  const range = resolveRange(from, to);
  const now = currentWindow(range);
  const prev = previousWindow(range);

  const [
    revenueNow,
    revenuePrev,
    ordersNow,
    ordersPrev,
    cancelledNow,
    cancelledPrev,
    receivables,
    revenueSeries,
    orderSeries,
    paymentMix,
    statusFunnel,
    topProducts,
    ordersByCity,
  ] = await Promise.all([
    paidRevenueIn(now),
    paidRevenueIn(prev),
    placedOrdersIn(now),
    placedOrdersIn(prev),
    cancelledOrdersIn(now),
    cancelledOrdersIn(prev),
    receivablesOutstanding(),
    revenueSeriesIn(range),
    orderSeriesIn(range),
    paymentMixIn(range),
    statusFunnelIn(range),
    topProductsIn(range),
    ordersByCityIn(range),
  ]);

  return {
    range: { from: range.from, to: range.to, granularity: range.granularity },
    revenue: scalar(revenueNow.total, revenuePrev.total),
    orders: scalar(ordersNow, ordersPrev),
    averageOrderValue: scalar(
      average(revenueNow.total, revenueNow.count),
      average(revenuePrev.total, revenuePrev.count),
    ),
    receivables,
    cancelledOrders: scalar(cancelledNow, cancelledPrev),
    revenueSeries,
    orderSeries,
    paymentMix,
    statusFunnel,
    topProducts,
    ordersByCity,
  };
};

const LIVE_PRODUCT = { isDeleted: false };

const tile = (
  key: string,
  label: string,
  count: number,
  href: string,
  warnWhenNonZero = true,
): TOperationsTile => ({
  key,
  label,
  count,
  href,
  tone: warnWhenNonZero && count > 0 ? "warn" : "neutral",
});

const getOperations = async (user: TAuthUser): Promise<TOperationsResponse> => {
  const canViewOrders = hasPermission(
    user,
    PermissionModule.Order,
    OrderPermission.ViewOrders,
  );
  const canViewProducts = hasPermission(
    user,
    PermissionModule.Product,
    ProductPermission.ViewProducts,
  );
  const canViewContacts = hasPermission(
    user,
    PermissionModule.Contact,
    ContactPermission.ViewContacts,
  );

  const [orderTiles, productTiles, contactTiles] = await Promise.all([
    canViewOrders
      ? Promise.all([
          Order.countDocuments({ status: "pending" }),
          Order.countDocuments({ status: "processing" }),
          Order.countDocuments({
            status: "shipped",
            paymentMethod: "cod",
            paymentStatus: "pending",
          }),
        ]).then(([pending, processing, codInTransit]) => [
          tile("orders-pending", "Orders to confirm", pending, "/orders?status=pending"),
          tile(
            "orders-processing",
            "Orders to ship",
            processing,
            "/orders?status=processing",
          ),
          tile(
            "cod-in-transit",
            "COD awaiting collection",
            codInTransit,
            "/orders?status=shipped&paymentMethod=cod&paymentStatus=pending",
            false,
          ),
        ])
      : Promise.resolve([]),
    canViewProducts
      ? Promise.all([
          Product.countDocuments({ ...LIVE_PRODUCT, stock: { $lte: 0 } }),
          Product.countDocuments({
            ...LIVE_PRODUCT,
            stock: { $gt: 0, $lte: LOW_STOCK_THRESHOLD },
          }),
        ]).then(([outOfStock, lowStock]) => [
          tile("products-out-of-stock", "Out of stock", outOfStock, "/products"),
          tile(
            "products-low-stock",
            `Low stock (≤ ${LOW_STOCK_THRESHOLD})`,
            lowStock,
            "/products",
          ),
        ])
      : Promise.resolve([]),
    canViewContacts
      ? Contact.countDocuments({ status: "new" }).then((count) => [
          tile("contacts-new", "New messages", count, "/contacts?status=new"),
        ])
      : Promise.resolve([]),
  ]);

  return { tiles: [...orderTiles, ...productTiles, ...contactTiles] };
};

const CUSTOMER_MATCH = { isDeleted: false, userType: UserType.Customer };

const getGrowth = async (
  from?: string,
  to?: string,
): Promise<TGrowthResponse> => {
  const range = resolveRange(from, to);

  const signupsIn = (window: TWindow) =>
    User.countDocuments({ ...CUSTOMER_MATCH, createdAt: within(window) });

  const [signupsNow, signupsPrev, seriesRows, active, inactive, verifyRows] =
    await Promise.all([
      signupsIn(currentWindow(range)),
      signupsIn(previousWindow(range)),
      User.aggregate<{ _id: string; value: number }>([
        { $match: { ...CUSTOMER_MATCH, createdAt: rangeWindow(range) } },
        { $group: { _id: dayBucket("$createdAt"), value: { $sum: 1 } } },
      ]),
      User.countDocuments({ ...CUSTOMER_MATCH, status: "active" }),
      User.countDocuments({ ...CUSTOMER_MATCH, status: "inactive" }),
      User.aggregate<{ email: number; phone: number; none: number }>([
        { $match: CUSTOMER_MATCH },
        {
          $group: {
            _id: null,
            email: { $sum: { $cond: [{ $eq: ["$isEmailVerify", true] }, 1, 0] } },
            phone: { $sum: { $cond: [{ $eq: ["$isPhoneVerify", true] }, 1, 0] } },
            none: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $ne: ["$isEmailVerify", true] },
                      { $ne: ["$isPhoneVerify", true] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]),
    ]);

  const verify = verifyRows[0] ?? { email: 0, phone: 0, none: 0 };

  return {
    range: { from: range.from, to: range.to, granularity: range.granularity },
    signups: scalar(signupsNow, signupsPrev),
    signupSeries: fillSeries(toCountMap(seriesRows), range),
    activeSplit: [
      { key: "active", label: "Active", value: active },
      { key: "inactive", label: "Inactive", value: inactive },
    ],
    verifiedSplit: [
      { key: "email", label: "Email verified", value: verify.email },
      { key: "phone", label: "Phone verified", value: verify.phone },
      { key: "none", label: "Not verified", value: verify.none },
    ],
  };
};

const getCatalog = async (): Promise<TCatalogResponse> => {
  const [statusRows, stockRow, categoryRows] = await Promise.all([
    Product.aggregate<{ _id: string; value: number }>([
      { $match: LIVE_PRODUCT },
      { $group: { _id: "$status", value: { $sum: 1 } } },
    ]),
    Product.aggregate<{ out: number; low: number; healthy: number }>([
      { $match: LIVE_PRODUCT },
      {
        $group: {
          _id: null,
          out: { $sum: { $cond: [{ $lte: ["$stock", 0] }, 1, 0] } },
          low: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gt: ["$stock", 0] },
                    { $lte: ["$stock", LOW_STOCK_THRESHOLD] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          healthy: {
            $sum: { $cond: [{ $gt: ["$stock", LOW_STOCK_THRESHOLD] }, 1, 0] },
          },
        },
      },
    ]),
    Product.aggregate<{ _id: string; label: string | null; value: number }>([
      { $match: LIVE_PRODUCT },
      { $group: { _id: "$category", value: { $sum: 1 } } },
      { $sort: { value: -1 } },
      { $limit: TOP_CATEGORIES_LIMIT },
      {
        $lookup: {
          from: "categories",
          localField: "_id",
          foreignField: "_id",
          as: "category",
        },
      },
      {
        $project: {
          _id: { $toString: "$_id" },
          value: 1,
          label: { $first: "$category.name" },
        },
      },
    ]),
  ]);

  const statusCounts = toCountMap(statusRows);
  const stock = stockRow[0] ?? { out: 0, low: 0, healthy: 0 };

  return {
    totalProducts: statusRows.reduce((sum, row) => sum + row.value, 0),
    statusSplit: [
      { key: "show", label: "Published", value: statusCounts.get("show") ?? 0 },
      { key: "hide", label: "Hidden", value: statusCounts.get("hide") ?? 0 },
    ],
    stockSplit: [
      { key: "healthy", label: "In stock", value: stock.healthy },
      { key: "low", label: "Low stock", value: stock.low },
      { key: "out", label: "Out of stock", value: stock.out },
    ],
    productsPerCategory: categoryRows.map((row) => ({
      key: row._id,
      label: row.label ?? "Uncategorized",
      value: row.value,
    })),
  };
};

export const dashboardServices = {
  getCommercial,
  getOperations,
  getGrowth,
  getCatalog,
};
