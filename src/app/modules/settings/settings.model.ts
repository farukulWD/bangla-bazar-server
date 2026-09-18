import { Schema, model } from "mongoose";

import { PAYMENT_METHODS, SHIPPING_OPTION_KEYS } from "../order/order.constant";
import { SETTINGS_DOC_KEY } from "./settings.constant";
import {
  CHECKOUT_DEFAULTS,
  INTEGRATIONS_DEFAULTS,
  STORE_DEFAULTS,
} from "./settings.defaults";
import { TSettings } from "./settings.interface";

const nested = { _id: false } as const;

const storeSchema = new Schema(
  {
    shopName: { type: String, trim: true, default: STORE_DEFAULTS.shopName },
    companyName: { type: String, trim: true, default: "" },
    logo: { type: String, default: "" },
    logoDark: { type: String, default: "" },
    favicon: { type: String, default: "" },
    address: { type: String, trim: true, default: "" },
    city: { type: String, trim: true, default: "" },
    postCode: { type: String, trim: true, default: "" },
    country: { type: String, trim: true, default: STORE_DEFAULTS.country },
    contact: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, lowercase: true, default: "" },
    fromEmail: { type: String, trim: true, lowercase: true, default: "" },
    website: { type: String, trim: true, default: "" },
    vatNumber: { type: String, trim: true, default: "" },
    currencySymbol: { type: String, default: STORE_DEFAULTS.currencySymbol },
    currencyCode: {
      type: String,
      uppercase: true,
      default: STORE_DEFAULTS.currencyCode,
    },
    timeZone: { type: String, default: STORE_DEFAULTS.timeZone },
    dateFormat: { type: String, default: STORE_DEFAULTS.dateFormat },
    decimalPlaces: { type: Number, default: STORE_DEFAULTS.decimalPlaces },
    receiptSize: { type: String, default: STORE_DEFAULTS.receiptSize },
    invoiceFooterNote: { type: String, default: "" },
    numberOfImagePerProduct: {
      type: Number,
      min: 1,
      default: STORE_DEFAULTS.numberOfImagePerProduct,
    },
    emailToCustomer: {
      type: Boolean,
      default: STORE_DEFAULTS.emailToCustomer,
    },
  },
  nested,
);

const shippingOptionSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    note: { type: String, trim: true, default: "" },
    fee: { type: Number, min: 0, required: true },
    etaDays: { type: Number, min: 0, required: true },
    enabled: { type: Boolean, default: true },
  },
  nested,
);

const paymentMethodSchema = new Schema(
  {
    label: { type: String, trim: true, required: true },
    enabled: { type: Boolean, default: true },
  },
  nested,
);

const keyedSchema = (keys: readonly string[], schema: Schema) =>
  new Schema(
    Object.fromEntries(keys.map((key) => [key, { type: schema }])),
    nested,
  );

const checkoutSchema = new Schema(
  {
    shipping: {
      type: keyedSchema(SHIPPING_OPTION_KEYS, shippingOptionSchema),
      default: () => CHECKOUT_DEFAULTS.shipping,
    },
    paymentMethods: {
      type: keyedSchema(PAYMENT_METHODS, paymentMethodSchema),
      default: () => CHECKOUT_DEFAULTS.paymentMethods,
    },
    freeDeliveryOver: {
      type: Number,
      min: 0,
      default: CHECKOUT_DEFAULTS.freeDeliveryOver,
    },
    lowStockThreshold: {
      type: Number,
      min: 0,
      default: CHECKOUT_DEFAULTS.lowStockThreshold,
    },
  },
  nested,
);

const oauthProviderSchema = new Schema(
  {
    enabled: { type: Boolean, default: false },
    clientId: { type: String, trim: true, default: "" },
    clientSecret: { type: String, default: "" },
  },
  nested,
);

const integrationsSchema = new Schema(
  {
    analytics: {
      type: new Schema(
        {
          googleAnalyticsId: { type: String, trim: true, default: "" },
          googleAnalyticsEnabled: { type: Boolean, default: false },
          fbPixelId: { type: String, trim: true, default: "" },
          fbPixelEnabled: { type: Boolean, default: false },
        },
        nested,
      ),
      default: () => INTEGRATIONS_DEFAULTS.analytics,
    },
    socialLogin: {
      type: new Schema(
        {
          google: { type: oauthProviderSchema },
          facebook: { type: oauthProviderSchema },
          github: { type: oauthProviderSchema },
        },
        nested,
      ),
      default: () => INTEGRATIONS_DEFAULTS.socialLogin,
    },
    chat: {
      type: new Schema(
        {
          tawkEnabled: { type: Boolean, default: false },
          tawkPropertyId: { type: String, trim: true, default: "" },
          tawkWidgetId: { type: String, trim: true, default: "" },
        },
        nested,
      ),
      default: () => INTEGRATIONS_DEFAULTS.chat,
    },
    social: {
      type: new Schema(
        {
          facebook: { type: String, trim: true, default: "" },
          twitter: { type: String, trim: true, default: "" },
          instagram: { type: String, trim: true, default: "" },
          linkedin: { type: String, trim: true, default: "" },
          youtube: { type: String, trim: true, default: "" },
          whatsapp: { type: String, trim: true, default: "" },
          pinterest: { type: String, trim: true, default: "" },
        },
        nested,
      ),
      default: () => INTEGRATIONS_DEFAULTS.social,
    },
  },
  nested,
);

const settingsSchema = new Schema<TSettings>(
  {
    key: {
      type: String,
      required: true,
      default: SETTINGS_DOC_KEY,
    },
    store: { type: storeSchema, default: () => ({}) },
    checkout: { type: checkoutSchema, default: () => ({}) },
    integrations: { type: integrationsSchema, default: () => ({}) },

    storefront: { type: Schema.Types.Mixed, default: () => ({}) },
  },
  { timestamps: true, minimize: false },
);

settingsSchema.index({ key: 1 }, { unique: true });

export const Settings = model<TSettings>("Settings", settingsSchema);
