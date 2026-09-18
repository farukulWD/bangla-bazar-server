import { Types } from "mongoose";
import z from "zod";
import { PRODUCT_BULK_MAX, PRODUCT_STATUS } from "./product.constant";

const objectId = z
  .string()
  .trim()
  .refine((value) => Types.ObjectId.isValid(value), "That id is not valid");

const title = z.string().trim().min(1, "Product title is required");
const description = z.string().trim().optional();
const slug = z.string().trim().min(1).optional();
const status = z.enum(PRODUCT_STATUS);
const code = z.string().trim().max(64).optional();
const money = z.number().min(0, "A price cannot be negative");
const quantity = z.int().min(0, "Stock cannot be negative");

const idParams = z.object({ id: objectId });

const prices = z.object({
  originalPrice: money,
  price: money,
});

const variantOption = z.object({
  attributeId: objectId,
  valueId: objectId,
});

export const variantRowSchema = z.object({
  _id: objectId.optional(),
  options: z.array(variantOption).min(1, "A variant needs at least one option"),
  sku: code,
  barcode: code,
  originalPrice: money,
  price: money,
  stock: quantity.optional(),
  image: z.url("That image is not a valid URL").optional(),
});

const productObjectSchema = z.object({
  title,
  description,
  slug,
  sku: code,
  barcode: code,
  category: objectId,
  categories: z.array(objectId).optional(),
  images: z.array(z.url("That image is not a valid URL")).optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  prices,
  stock: quantity.optional(),
  variants: z.array(variantRowSchema).optional(),
  status: status.optional(),
});

type TPricedRow = {
  prices?: { originalPrice: number; price: number };
  variants?: { originalPrice: number; price: number }[];
};

const refinePrices = (row: TPricedRow, ctx: z.RefinementCtx) => {
  const tooHigh = "The selling price cannot be above the original price";

  if (row.prices && row.prices.price > row.prices.originalPrice) {
    ctx.addIssue({
      code: "custom",
      path: ["prices", "price"],
      message: tooHigh,
    });
  }

  row.variants?.forEach((variant, index) => {
    if (variant.price > variant.originalPrice) {
      ctx.addIssue({
        code: "custom",
        path: ["variants", index, "price"],
        message: tooHigh,
      });
    }
  });
};

export const productRowSchema = productObjectSchema.superRefine(refinePrices);

const ids = z
  .array(objectId)
  .min(1, "Select at least one product")
  .max(
    PRODUCT_BULK_MAX,
    `Select at most ${PRODUCT_BULK_MAX} products at a time`,
  );

const createProductValidationSchema = z.object({
  body: productRowSchema,
});

const updateProductValidationSchema = z.object({
  body: productObjectSchema.partial().superRefine(refinePrices),
  params: idParams,
});

const updateStatusValidationSchema = z.object({
  params: idParams,
  body: z.object({ status }),
});

const idParamValidationSchema = z.object({
  params: idParams,
});

const slugParamValidationSchema = z.object({
  params: z.object({ slug: z.string().trim().min(1) }),
});

const jobParamValidationSchema = z.object({
  params: z.object({ jobId: z.string().trim().min(1) }),
});

const bulkCreateValidationSchema = z.object({
  body: z.object({
    products: z
      .array(z.unknown())
      .min(1, "Send at least one product")
      .max(
        PRODUCT_BULK_MAX,
        `Send at most ${PRODUCT_BULK_MAX} products at a time`,
      ),
  }),
});

const bulkUpdateValidationSchema = z.object({
  body: z.object({
    ids,
    status: status.optional(),
    category: objectId.optional(),
  }),
});

const bulkDeleteValidationSchema = z.object({
  body: z.object({ ids }),
});

const bulkExportValidationSchema = z.object({
  body: z.object({
    status: status.optional(),
    category: objectId.optional(),
  }),
});

export const productValidation = {
  createProductValidationSchema,
  updateProductValidationSchema,
  updateStatusValidationSchema,
  idParamValidationSchema,
  slugParamValidationSchema,
  jobParamValidationSchema,
  bulkCreateValidationSchema,
  bulkUpdateValidationSchema,
  bulkDeleteValidationSchema,
  bulkExportValidationSchema,
};
