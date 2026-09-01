export const CATEGORY_SEARCHABLE_FIELDS = [
  "name",
  "slug",
  "description",
  "parentName",
];

export const CATEGORY_STATUS = ["show", "hide"] as const;

/**
 * QueryBuilder.filter() does not strip its own control keys, so they are named here.
 * A key missing from this list reaches Mongo as a field filter and the query
 * silently returns nothing.
 */
export const CATEGORY_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
];
