export const PRODUCT_STATUS = ["show", "hide"] as const;

export const IMAGE_STATUS = ["ready", "processing", "failed"] as const;

export const PRODUCT_SEARCHABLE_FIELDS = ["title", "slug", "sku", "barcode"];

/**
 * Every key the list endpoint understands but Mongo must not see as a field filter.
 * QueryBuilder.filter() strips only what it is given, so a key missing here reaches
 * the query as `{ minPrice: "10" }` and silently matches nothing.
 */
export const PRODUCT_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
  "category",
  "minPrice",
  "maxPrice",
  "inStock",
  "discounted",
];

export const PRODUCT_IMAGES_MAX = 10;
export const PRODUCT_BULK_MAX = 500;
export const PRODUCT_RELATED_LIMIT = 8;
export const PRODUCT_POPULAR_LIMIT = 20;
export const PRODUCT_DISCOUNTED_LIMIT = 20;
