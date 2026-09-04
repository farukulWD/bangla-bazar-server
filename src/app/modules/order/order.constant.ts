export const ORDER_STATUS = [
  "pending",
  "processing",
  "shipped",
  "delivered",
  "cancelled",
] as const;

type TStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_FLOW: Record<TStatus, readonly TStatus[]> = {
  pending: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
  delivered: [],
  cancelled: [],
};

export const ORDER_CUSTOMER_CANCELLABLE: readonly TStatus[] = [
  "pending",
  "processing",
];

export const PAYMENT_METHODS = ["cod", "sslcommerz"] as const;

/** Methods whose money moves through a gateway before delivery, not at the door. */
export const ONLINE_PAYMENT_METHODS = ["sslcommerz"] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "failed",
] as const;

export const SHIPPING_OPTION_KEYS = ["standard", "express"] as const;

/** Where the legacy `invoice` counter left off (lib/auto-increment.js). */
export const ORDER_INVOICE_SEED = 10000;
export const ORDER_COUNTER_ID = "order";

export const ORDER_LIST_LIMIT_MAX = 100;

export const ORDER_EXPORT_MAX = 50_000;

export const ORDER_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
  "status",
  "paymentStatus",
  "paymentMethod",
  "userId",
  "from",
  "to",
];
