export const CONTACT_NAME_MAX = 100;
export const CONTACT_EMAIL_MAX = 254;
export const CONTACT_SUBJECT_MAX = 150;
export const CONTACT_MESSAGE_MIN = 10;
export const CONTACT_MESSAGE_MAX = 2000;

export const CONTACT_STATUS = ["new", "read", "replied", "archived"] as const;

export const CONTACT_SEARCHABLE_FIELDS = [
  "name",
  "email",
  "subject",
  "message",
];

/**
 * QueryBuilder.filter() does not strip its own control keys, so they are named here.
 * A key missing from this list reaches Mongo as a field filter and the query
 * silently returns nothing.
 */
export const CONTACT_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "page",
  "limit",
  "fields",
  "from",
  "to",
];
