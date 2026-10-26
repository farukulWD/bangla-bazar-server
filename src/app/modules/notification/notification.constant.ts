export const NOTIFICATION_AUDIENCES = ["customer", "staff"] as const;

export const NOTIFICATION_EVENTS = [
  "order.placed",
  "order.status",
  "order.cancelled",
  "order.payment",
  "product.low_stock",
  "coupon.expiring",
  "review.submitted",
] as const;

export const NOTIFICATION_SUBJECT_KINDS = [
  "order",
  "product",
  "coupon",
  "review",
] as const;

export const NOTIFICATION_TITLE_MAX = 160;
export const NOTIFICATION_BODY_MAX = 500;

export const NOTIFICATION_LIST_LIMIT_DEFAULT = 20;
export const NOTIFICATION_LIST_LIMIT_MAX = 50;

export const NOTIFICATION_RETENTION_DAYS = 90;

export const NOTIFICATION_INSERT_BATCH = 500;

export const COUPON_EXPIRY_WARNING_DAYS = 3;

export const COUPON_EXPIRY_SWEEP_CRON = "0 3 * * *";
