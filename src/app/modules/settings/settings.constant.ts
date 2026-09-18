import { TSettingsGroup } from "./settings.interface";

export const SETTINGS_GROUPS = [
  "store",
  "checkout",
  "integrations",
  "storefront",
] as const;

export const SETTINGS_DOC_KEY = "app";

export const SETTINGS_CACHE_TTL_MS = 60_000;

export const SECRET_FIELD_PATHS = [
  "integrations.socialLogin.google.clientSecret",
  "integrations.socialLogin.facebook.clientSecret",
  "integrations.socialLogin.github.clientSecret",
] as const;

export const PUBLIC_FIELD_PATHS = [
  "store",
  "storefront",
  "checkout.shipping",
  "checkout.paymentMethods",
  "checkout.freeDeliveryOver",
  "integrations.analytics",
  "integrations.chat",
  "integrations.social",
  "integrations.socialLogin.google.enabled",
  "integrations.socialLogin.google.clientId",
  "integrations.socialLogin.facebook.enabled",
  "integrations.socialLogin.facebook.clientId",
  "integrations.socialLogin.github.enabled",
  "integrations.socialLogin.github.clientId",
] as const;

export const isSettingsGroup = (value: string): value is TSettingsGroup =>
  (SETTINGS_GROUPS as readonly string[]).includes(value);
