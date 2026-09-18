export const CURRENCY_SEARCHABLE_FIELDS = ["code", "name"];

export const CURRENCY_STATUS = ["active", "inactive"] as const;

export const SYMBOL_POSITIONS = ["before", "after"] as const;

export const CURRENCY_NAME_MAX = 60;
export const CURRENCY_SYMBOL_MAX = 8;

/** ISO 4217 tops out at 4 decimals; nothing in circulation uses more. */
export const CURRENCY_DECIMALS_MAX = 4;

export const CURRENCY_CACHE_TTL_MS = 60_000;

/** SSLCommerz settles Bangladeshi taka only. */
export const GATEWAY_CURRENCY_CODE = "BDT";

export const CURRENCY_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
];

export const NOT_DELETED = { isDeleted: { $ne: true } };
