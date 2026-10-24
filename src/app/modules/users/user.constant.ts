export const USER_ROLE = {
  superAdmin: "superAdmin",
  customer: "customer",
  admin: "admin",
} as const;

export const UserStatus = ["active", "inactive"];

export const CUSTOMER_BULK_MAX = 100;

export const CUSTOMER_EXPORT_MAX = 10_000;
