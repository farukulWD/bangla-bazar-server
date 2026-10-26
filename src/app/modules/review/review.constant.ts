export const REVIEW_STATUS = ["pending", "approved", "rejected"] as const;

export const REVIEW_RATING_MIN = 1;
export const REVIEW_RATING_MAX = 5;
export const REVIEW_TITLE_MAX = 100;
export const REVIEW_COMMENT_MIN = 10;
export const REVIEW_COMMENT_MAX = 1000;
export const REVIEW_REPLY_MAX = 1000;
export const REVIEW_REJECTION_MAX = 300;

export const REVIEW_PUBLIC_LIMIT_MAX = 20;
export const REVIEW_BULK_MAX = 100;

export const REVIEW_PUBLIC_SORTS = ["newest", "highest", "lowest"] as const;

export const REVIEW_SEARCHABLE_FIELDS = ["title", "comment"];

export const REVIEW_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
];
