import z from "zod";

import { PAYMENT_METHODS, SHIPPING_OPTION_KEYS } from "../order/order.constant";
import { SETTINGS_GROUPS } from "./settings.constant";
import { STOREFRONT_DEFAULTS } from "./settings.storefront";

const recordOf = <T extends z.ZodTypeAny>(
  keys: readonly string[],
  schema: T,
): z.ZodObject<Record<string, T>> =>
  z
    .object(Object.fromEntries(keys.map((key) => [key, schema])))
    .strict() as z.ZodObject<Record<string, T>>;

const shippingOptionSchema = z
  .object({
    label: z.string().trim().min(1, "A delivery option needs a label"),
    note: z.string().trim(),
    fee: z.number().min(0, "A delivery fee cannot be negative"),
    etaDays: z.int().min(0, "A delivery estimate cannot be negative"),
    enabled: z.boolean(),
  })
  .strict();

const paymentMethodSchema = z
  .object({
    label: z.string().trim().min(1, "A payment method needs a label"),
    enabled: z.boolean(),
  })
  .strict();

export const storeSchema = z
  .object({
    shopName: z.string().trim().min(1, "The shop needs a name"),
    companyName: z.string().trim(),
    logo: z.string().trim(),
    logoDark: z.string().trim(),
    favicon: z.string().trim(),
    address: z.string().trim(),
    city: z.string().trim(),
    postCode: z.string().trim(),
    country: z.string().trim(),
    contact: z.string().trim(),
    email: z.union([z.literal(""), z.email("That email is not valid")]),
    fromEmail: z.union([z.literal(""), z.email("That email is not valid")]),
    website: z.string().trim(),
    vatNumber: z.string().trim(),
    timeZone: z.string().trim().min(1),
    dateFormat: z.string().trim().min(1),
    receiptSize: z.string().trim(),
    invoiceFooterNote: z.string().trim(),
    numberOfImagePerProduct: z.int().min(1).max(20),
    emailToCustomer: z.boolean(),
  })
  .strict();

export const checkoutSchema = z
  .object({
    shipping: recordOf(SHIPPING_OPTION_KEYS, shippingOptionSchema),
    paymentMethods: recordOf(PAYMENT_METHODS, paymentMethodSchema),
    freeDeliveryOver: z.number().min(0),
    lowStockThreshold: z.int().min(0),
  })
  .strict();

const oauthProviderSchema = z
  .object({
    enabled: z.boolean(),
    clientId: z.string().trim(),

    clientSecret: z.string().nullable(),
  })
  .strict();

export const integrationsSchema = z
  .object({
    analytics: z
      .object({
        googleAnalyticsId: z.string().trim(),
        googleAnalyticsEnabled: z.boolean(),
        fbPixelId: z.string().trim(),
        fbPixelEnabled: z.boolean(),
      })
      .strict(),
    socialLogin: z
      .object({
        google: oauthProviderSchema,
        facebook: oauthProviderSchema,
        github: oauthProviderSchema,
      })
      .strict(),
    chat: z
      .object({
        tawkEnabled: z.boolean(),
        tawkPropertyId: z.string().trim(),
        tawkWidgetId: z.string().trim(),
      })
      .strict(),
    social: z
      .object({
        facebook: z.string().trim(),
        twitter: z.string().trim(),
        instagram: z.string().trim(),
        linkedin: z.string().trim(),
        youtube: z.string().trim(),
        whatsapp: z.string().trim(),
        pinterest: z.string().trim(),
      })
      .strict(),
  })
  .strict();

const schemaFromValue = (value: unknown): z.ZodType => {
  if (Array.isArray(value)) {
    const [first] = value;
    return z.array(typeof first === "number" ? z.number() : z.string());
  }
  if (value !== null && typeof value === "object") {
    return z
      .object(
        Object.fromEntries(
          Object.entries(value).map(([key, child]) => [
            key,
            schemaFromValue(child),
          ]),
        ),
      )
      .strict();
  }
  if (typeof value === "number") {
    return z.number();
  }
  if (typeof value === "boolean") {
    return z.boolean();
  }
  return z.string();
};

export const storefrontSchema = schemaFromValue(
  STOREFRONT_DEFAULTS,
) as z.ZodObject;

export const deepPartial = (schema: z.ZodTypeAny): z.ZodType => {
  if (schema instanceof z.ZodObject) {
    const shape = Object.fromEntries(
      Object.entries(schema.shape as Record<string, z.ZodTypeAny>).map(
        ([key, child]) => [key, deepPartial(child).optional()],
      ),
    );
    return z.object(shape).strict();
  }
  return schema;
};

export const GROUP_SCHEMAS = {
  store: storeSchema,
  checkout: checkoutSchema,
  integrations: integrationsSchema,
  storefront: storefrontSchema,
} as const;

export const GROUP_UPDATE_SCHEMAS = {
  store: deepPartial(storeSchema),
  checkout: deepPartial(checkoutSchema),
  integrations: deepPartial(integrationsSchema),
  storefront: deepPartial(storefrontSchema),
} as const;

const groupParams = z.object({
  group: z.enum(SETTINGS_GROUPS, {
    message: `Settings group must be one of: ${SETTINGS_GROUPS.join(", ")}`,
  }),
});

const groupParamValidationSchema = z.object({ params: groupParams });

const updateSettingsValidationSchema = z.object({
  params: groupParams,
  body: z.record(z.string(), z.unknown()),
});

export const settingsValidation = {
  groupParamValidationSchema,
  updateSettingsValidationSchema,
};
