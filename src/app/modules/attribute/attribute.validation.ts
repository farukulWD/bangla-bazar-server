import { Types } from "mongoose";
import z from "zod";
import {
  ATTRIBUTE_OPTIONS,
  ATTRIBUTE_STATUS,
  ATTRIBUTE_TYPES,
} from "./attribute.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const name = z.string().trim().min(1, "Attribute name is required");
const valueName = z.string().trim().min(1, "Value name is required");
const slug = z.string().trim().min(1).optional();
const status = z.enum(ATTRIBUTE_STATUS);
const option = z.enum(ATTRIBUTE_OPTIONS);
const type = z.enum(ATTRIBUTE_TYPES);

const idParams = z.object({ id: objectId });
const valueParams = z.object({ id: objectId, valueId: objectId });

export const attributeValueRowSchema = z.object({
  name: valueName,
  status: status.optional(),
});

export const attributeRowSchema = z.object({
  name,
  slug,
  option,
  type: type.optional(),
  status: status.optional(),
  values: z.array(attributeValueRowSchema).optional(),
});

const ids = z
  .array(objectId)
  .min(1, "Select at least one attribute")
  .max(500, "Select at most 500 attributes at a time");

const valueIds = z
  .array(objectId)
  .min(1, "Select at least one value")
  .max(500, "Select at most 500 values at a time");

const createAttributeValidationSchema = z.object({
  body: attributeRowSchema,
});

const bulkCreateValidationSchema = z.object({
  body: z.object({
    attributes: z
      .array(z.unknown())
      .min(1, "Send at least one attribute")
      .max(500, "Send at most 500 attributes at a time"),
  }),
});

const updateAttributeValidationSchema = z.object({
  params: idParams,
  body: attributeRowSchema.omit({ values: true }).partial(),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status }),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

const valueParamValidationSchema = z.object({
  params: valueParams,
});

const createValueValidationSchema = z.object({
  params: idParams,
  body: attributeValueRowSchema,
});

const updateValueValidationSchema = z.object({
  params: valueParams,
  body: attributeValueRowSchema.partial(),
});

const updateValueStatusValidationSchema = z.object({
  params: valueParams,
  body: z.object({ status }),
});

const bulkDeleteValidationSchema = z.object({
  body: z.object({ ids }),
});

const bulkUpdateValidationSchema = z.object({
  body: z.object({
    ids,
    status: status.optional(),
    option: option.optional(),
    type: type.optional(),
  }),
});

const bulkDeleteValuesValidationSchema = z.object({
  params: idParams,
  body: z.object({ valueIds }),
});

export const attributeValidation = {
  createAttributeValidationSchema,
  bulkCreateValidationSchema,
  updateAttributeValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
  valueParamValidationSchema,
  createValueValidationSchema,
  updateValueValidationSchema,
  updateValueStatusValidationSchema,
  bulkDeleteValidationSchema,
  bulkUpdateValidationSchema,
  bulkDeleteValuesValidationSchema,
};
