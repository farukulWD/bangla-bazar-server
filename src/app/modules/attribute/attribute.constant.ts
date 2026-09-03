export const ATTRIBUTE_SEARCHABLE_FIELDS = ["name", "slug"];

export const ATTRIBUTE_STATUS = ["show", "hide"] as const;

export const ATTRIBUTE_OPTIONS = ["dropdown", "radio", "checkbox"] as const;

export const ATTRIBUTE_TYPES = ["attribute", "extra"] as const;

export const ATTRIBUTE_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
];
