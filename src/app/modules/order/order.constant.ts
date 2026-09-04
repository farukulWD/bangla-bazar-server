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

// TODO: Should be dynamic
export const PAYMENT_METHODS = ["cod", "sslcommerz"] as const;

/** Methods whose money moves through a gateway before delivery, not at the door. */
export const ONLINE_PAYMENT_METHODS = ["sslcommerz"] as const;

export const PAYMENT_STATUSES = [
  "pending",
  "paid",
  "refunded",
  "failed",
] as const;

// TODO: Should be dynamic
export const SHIPPING_OPTIONS = [
  {
    key: "standard",
    label: "Standard Delivery",
    note: "Delivered in 3-5 days",
    fee: 60,
    etaDays: 5,
  },
  {
    key: "express",
    label: "Express Delivery",
    note: "Delivered within 24 hours",
    fee: 120,
    etaDays: 1,
  },
] as const;

/** Waives the standard fee only; express is a real cost whatever the basket. */
// TODO: Should be dynamic
export const FREE_DELIVERY_OVER = 2000;

/** Staff are alerted once a sale leaves a product at or below this. */
// TODO: Should be dynamic
export const LOW_STOCK_THRESHOLD = 5;

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
