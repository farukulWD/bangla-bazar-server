import z from "zod";

import {
  ORDER_STATUS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  SHIPPING_OPTIONS,
} from "./order.constant";

const SHIPPING_KEYS = SHIPPING_OPTIONS.map((option) => option.key) as [
  string,
  ...string[],
];

const objectId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);

const idParamValidationSchema = z.object({
  params: z.object({
    id: objectId("Order"),
  }),
});

const placeOrderValidationSchema = z.object({
  body: z.object({
    addressId: objectId("Delivery address"),
    shippingOption: z.enum(SHIPPING_KEYS, {
      error: "Choose a delivery option",
    }),
    paymentMethod: z.enum(PAYMENT_METHODS, {
      error: "Choose a payment method",
    }),
  }),
});

const updateStatusValidationSchema = z.object({
  params: z.object({ id: objectId("Order") }),
  body: z.object({
    status: z.enum(ORDER_STATUS, { error: "Choose a valid order status" }),
  }),
});

const updatePaymentStatusValidationSchema = z.object({
  params: z.object({ id: objectId("Order") }),
  body: z.object({
    paymentStatus: z.enum(PAYMENT_STATUSES, {
      error: "Choose a valid payment status",
    }),
  }),
});

export const orderValidation = {
  idParamValidationSchema,
  placeOrderValidationSchema,
  updateStatusValidationSchema,
  updatePaymentStatusValidationSchema,
};
