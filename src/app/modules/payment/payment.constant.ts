export const PAYMENT_PROVIDERS = ["sslcommerz"] as const;

export const PAYMENT_STATES = [
  "initiated",
  "pending",
  "paid",
  "failed",
  "cancelled",
  "mismatched",
  "expired",
] as const;

export const PAYMENT_OPEN_STATES = ["initiated", "pending"] as const;

export const PAYMENT_CALLBACK_SOURCES = [
  "success",
  "fail",
  "cancel",
  "ipn",
] as const;

export const PAYMENT_SETTLE_STATES = [
  "paid",
  "failed",
  "cancelled",
  "pending",
  "mismatched",
  "unknown",
  "error",
] as const;

export const SSL_SANDBOX_BASE = "https://sandbox.sslcommerz.com";
export const SSL_LIVE_BASE = "https://securepay.sslcommerz.com";
export const SSL_INIT_PATH = "/gwprocess/v4/api.php";
export const SSL_VALIDATOR_PATH = "/validator/api/validationserverAPI.php";

export const SSL_INIT_TIMEOUT_MS = 15_000;
export const SSL_VALIDATE_TIMEOUT_MS = 10_000;

/** SSLCommerz caps tran_id at 30 alphanumeric characters. */
export const SSL_TRAN_ID_MAX = 30;

/** The gateway rejects anything below this with "Amount is less than minimum". */
export const SSL_MIN_AMOUNT = 10;

/**
 * Both are success. VALIDATED is what the loser of the redirect/IPN race sees —
 * treating only VALID as success breaks intermittently, in production, under load.
 */
export const SSL_VALID_STATES = ["VALID", "VALIDATED"] as const;

/** Money is whole taka, but the validator hands it back as the string "1250.00". */
export const PAYMENT_AMOUNT_EPSILON = 0.01;

/** Caps document growth under an IPN retry storm. */
export const PAYMENT_CALLBACK_LOG_MAX = 20;

export const PAYMENT_LIST_LIMIT_MAX = 100;

export const PAYMENT_QUERY_CONTROL_KEYS = [
  "searchTerm",
  "sort",
  "limit",
  "page",
  "fields",
  "status",
  "provider",
  "orderId",
  "userId",
  "from",
  "to",
];

/** SSLCommerz product_profile / product_category vocabulary. */
export const SSL_PRODUCT_PROFILE = "physical-goods";
export const SSL_PRODUCT_CATEGORY = "Grocery";
export const SSL_SHIPPING_METHOD = "Courier";
export const SSL_PRODUCT_NAME_MAX = 200;

/** cus_email and cus_postcode are mandatory at the gateway; our order address may
 *  legitimately hold "" for both. */
export const PAYMENT_FALLBACK_EMAIL = "noreply@banglabazar.com";
export const PAYMENT_FALLBACK_POSTCODE = "0000";

/** Reserved for the deferred abandonment sweeper — see the README. */
export const PAYMENT_EXPIRE_AFTER_MINUTES = 60;
