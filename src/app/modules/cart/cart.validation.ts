import z from "zod";

import { CART_MAX_LINES, CART_MAX_QTY } from "./cart.constant";

const objectId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);

const variantId = objectId("Variant").nullish();

const qty = z
  .number({ error: "Quantity is required" })
  .int("Quantity must be a whole number")
  .min(0, "Quantity cannot be negative")
  .max(CART_MAX_QTY, `You can order at most ${CART_MAX_QTY} of one item`);

const cartLineSchema = z.object({
  productId: objectId("Product"),
  variantId,
  qty,
});

const setCartItemValidationSchema = z.object({
  body: cartLineSchema,
});

const lineParamValidationSchema = z.object({
  params: z.object({
    lineId: objectId("Cart line"),
  }),
});

const mergeCartValidationSchema = z.object({
  body: z.object({
    lines: z
      .array(cartLineSchema)
      .max(CART_MAX_LINES, `A cart holds at most ${CART_MAX_LINES} items`),
  }),
});

export const cartValidation = {
  setCartItemValidationSchema,
  lineParamValidationSchema,
  mergeCartValidationSchema,
};
