import { HydratedDocument } from "mongoose";

import { PAYMENT_METHODS, SHIPPING_OPTION_KEYS } from "../order/order.constant";
import { STOREFRONT_DEFAULTS } from "./settings.storefront";

export type TSettingsGroup =
  | "store"
  | "checkout"
  | "integrations"
  | "storefront";

export type TStoreSettings = {
  shopName: string;
  companyName: string;
  logo: string;
  logoDark: string;
  favicon: string;
  address: string;
  city: string;
  postCode: string;
  country: string;
  contact: string;
  email: string;

  fromEmail: string;
  website: string;

  vatNumber: string;
  currencySymbol: string;
  currencyCode: string;
  timeZone: string;
  dateFormat: string;
  decimalPlaces: number;
  receiptSize: string;
  invoiceFooterNote: string;

  numberOfImagePerProduct: number;

  emailToCustomer: boolean;
};

type TShippingKey = (typeof SHIPPING_OPTION_KEYS)[number];
type TPaymentMethod = (typeof PAYMENT_METHODS)[number];

export type TShippingOptionSetting = {
  label: string;
  note: string;
  fee: number;
  etaDays: number;
  enabled: boolean;
};

export type TPaymentMethodSetting = {
  label: string;
  enabled: boolean;
};

export type TCheckoutSettings = {
  shipping: Record<TShippingKey, TShippingOptionSetting>;
  paymentMethods: Record<TPaymentMethod, TPaymentMethodSetting>;

  freeDeliveryOver: number;

  lowStockThreshold: number;
};

export type TOAuthProviderSetting = {
  enabled: boolean;
  clientId: string;
  clientSecret: string;
};

export type TIntegrationSettings = {
  analytics: {
    googleAnalyticsId: string;
    googleAnalyticsEnabled: boolean;
    fbPixelId: string;
    fbPixelEnabled: boolean;
  };
  socialLogin: {
    google: TOAuthProviderSetting;
    facebook: TOAuthProviderSetting;
    github: TOAuthProviderSetting;
  };
  chat: {
    tawkEnabled: boolean;
    tawkPropertyId: string;
    tawkWidgetId: string;
  };
  social: {
    facebook: string;
    twitter: string;
    instagram: string;
    linkedin: string;
    youtube: string;
    whatsapp: string;
    pinterest: string;
  };
};

export type TStorefrontSettings = typeof STOREFRONT_DEFAULTS;

export type TSettings = {
  key: string;
  store: TStoreSettings;
  checkout: TCheckoutSettings;
  integrations: TIntegrationSettings;
  storefront: TStorefrontSettings;
  createdAt: Date;
  updatedAt: Date;
};

export type TSettingsDocument = HydratedDocument<TSettings>;

export type TSettingsValues = Pick<
  TSettings,
  "store" | "checkout" | "integrations" | "storefront"
>;

export type TMaskedSecret = {
  isSet: boolean;
  hint: string;
};

export type TDeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? TDeepPartial<T[K]>
      : T[K];
};
