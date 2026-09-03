import { Types } from "mongoose";
import z from "zod";
import { CATEGORY_STATUS } from "./category.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const name = z.string().trim().min(1, "Category name is required");
const description = z.string().trim().optional();
const slug = z.string().trim().min(1).optional();
const parentName = z.string().trim().optional();
const icon = z.string().trim().optional();
const status = z.enum(CATEGORY_STATUS);

// A form clearing the parent sends "" or null rather than omitting the field.
const parentId = z.union([z.literal(""), z.null(), objectId]).optional();

const idParams = z.object({ id: objectId });

/**
 * Also applied row by row inside the bulk create service, so a single malformed
 * entry is reported against its index instead of rejecting the whole batch.
 */
export const categoryRowSchema = z.object({
  name,
  description,
  slug,
  parentId,
  parentName,
  icon,
  status: status.optional(),
});

const ids = z
  .array(objectId)
  .min(1, "Select at least one category")
  .max(500, "Select at most 500 categories at a time");

const createCategoryValidationSchema = z.object({
  body: categoryRowSchema,
});

/**
 * Only the envelope is checked here — the rows themselves are validated in the
 * service against `categoryRowSchema` so that one bad entry does not cost the
 * caller the rest of the batch.
 */
const bulkCreateValidationSchema = z.object({
  body: z.object({
    categories: z
      .array(z.unknown())
      .min(1, "Send at least one category")
      .max(500, "Send at most 500 categories at a time"),
  }),
});

const updateCategoryValidationSchema = z.object({
  params: idParams,
  body: categoryRowSchema.partial(),
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status }),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

const bulkDeleteValidationSchema = z.object({
  body: z.object({ ids }),
});

const bulkUpdateValidationSchema = z.object({
  body: z.object({
    ids,
    status: status.optional(),
    parentId,
    parentName,
    description,
    icon,
  }),
});

export const categoryValidation = {
  createCategoryValidationSchema,
  bulkCreateValidationSchema,
  updateCategoryValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
  bulkDeleteValidationSchema,
  bulkUpdateValidationSchema,
};
