export const ROLE_SEARCHABLE_FIELDS = ["name", "description"];

/**
 * QueryBuilder.filter() does not strip its own control keys, so they are named here.
 * A key missing from this list reaches Mongo as a field filter and the query
 * silently returns nothing.
 */
export const ROLE_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "page",
  "limit",
  "fields",
];
