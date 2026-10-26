export const DEFAULT_RANGE_DAYS = 30;
export const MAX_RANGE_DAYS = 366;
export const WEEKLY_THRESHOLD_DAYS = 60;

export const TOP_PRODUCTS_LIMIT = 5;
export const TOP_CITIES_LIMIT = 8;
export const TOP_CATEGORIES_LIMIT = 8;
export const LOW_STOCK_THRESHOLD = 5;

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  cod: "Cash on delivery",
  sslcommerz: "Online (SSLCommerz)",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};
