import z from "zod";

// TODO: every module carries its own copy of this. Worth extracting to a shared
// zod util, but that touches eight modules and belongs in its own change.
const objectId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);

const initPaymentValidationSchema = z.object({
  body: z.object({
    orderId: objectId("Order"),
  }),
});

const orderIdParamValidationSchema = z.object({
  params: z.object({
    orderId: objectId("Order"),
  }),
});

const idParamValidationSchema = z.object({
  params: z.object({
    id: objectId("Payment"),
  }),
});

export const paymentValidation = {
  initPaymentValidationSchema,
  orderIdParamValidationSchema,
  idParamValidationSchema,
};
