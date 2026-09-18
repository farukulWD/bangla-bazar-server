import {
  TCheckoutSettings,
  TIntegrationSettings,
  TSettingsValues,
  TStoreSettings,
} from "./settings.interface";
import { STOREFRONT_DEFAULTS } from "./settings.storefront";

export const STORE_DEFAULTS: TStoreSettings = {
  shopName: "Bangla Bazar",
  companyName: "Bangla Bazar Ltd",
  logo: "",
  logoDark: "",
  favicon: "",
  address: "",
  city: "",
  postCode: "",
  country: "Bangladesh",
  contact: "",
  email: "",
  fromEmail: "",
  website: "",
  vatNumber: "",
  currencySymbol: "৳",
  currencyCode: "BDT",
  timeZone: "Asia/Dhaka",
  dateFormat: "MMM D, YYYY",
  decimalPlaces: 2,
  receiptSize: "80-mm",
  invoiceFooterNote: "Thank you for shopping with us.",
  numberOfImagePerProduct: 5,
  emailToCustomer: true,
};

export const CHECKOUT_DEFAULTS: TCheckoutSettings = {
  shipping: {
    standard: {
      label: "Standard Delivery",
      note: "Delivered in 3-5 days",
      fee: 60,
      etaDays: 5,
      enabled: true,
    },
    express: {
      label: "Express Delivery",
      note: "Delivered within 24 hours",
      fee: 120,
      etaDays: 1,
      enabled: true,
    },
  },
  paymentMethods: {
    cod: { label: "Cash on Delivery", enabled: true },
    sslcommerz: { label: "Pay Online", enabled: true },
  },
  freeDeliveryOver: 2000,
  lowStockThreshold: 5,
};

export const INTEGRATIONS_DEFAULTS: TIntegrationSettings = {
  analytics: {
    googleAnalyticsId: "",
    googleAnalyticsEnabled: false,
    fbPixelId: "",
    fbPixelEnabled: false,
  },
  socialLogin: {
    google: { enabled: false, clientId: "", clientSecret: "" },
    facebook: { enabled: false, clientId: "", clientSecret: "" },
    github: { enabled: false, clientId: "", clientSecret: "" },
  },
  chat: {
    tawkEnabled: false,
    tawkPropertyId: "",
    tawkWidgetId: "",
  },
  social: {
    facebook: "",
    twitter: "",
    instagram: "",
    linkedin: "",
    youtube: "",
    whatsapp: "",
    pinterest: "",
  },
};

export const SETTINGS_DEFAULTS: TSettingsValues = {
  store: STORE_DEFAULTS,
  checkout: CHECKOUT_DEFAULTS,
  integrations: INTEGRATIONS_DEFAULTS,
  storefront: STOREFRONT_DEFAULTS,
};
