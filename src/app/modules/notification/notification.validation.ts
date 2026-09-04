import z from "zod";

const objectId = (label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .regex(/^[0-9a-fA-F]{24}$/, `${label} is not valid`);

const idParamValidationSchema = z.object({
  params: z.object({ id: objectId("Notification") }),
});

export const notificationValidation = {
  idParamValidationSchema,
};
