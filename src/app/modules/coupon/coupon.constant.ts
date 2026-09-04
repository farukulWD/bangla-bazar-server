export const COUPON_SEARCHABLE_FIELDS = ["title", "couponCode"];

export const COUPON_STATUS = ["show", "hide"] as const;

export const COUPON_DISCOUNT_TYPES = ["percentage", "fixed"] as const;

export const COUPON_TITLE_MAX = 120;
export const COUPON_CODE_MAX = 32;
export const COUPON_BULK_MAX = 500;

export const COUPON_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
  "from",
  "to",
];
