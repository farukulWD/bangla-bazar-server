import z from "zod";

const createCategoryValidationSchema = z.object({
  body: z.object({
    name: z.string({
      message: "Category name is required",
    }),
    description: z
      .string({ message: "Description is should be a string" })
      .optional(),
    slug: z.string().optional(),
    parentId: z.string().optional(),
    parentName: z.string().optional(),
    status: z.enum(["show", "hide"]).optional(),
  }),
});

export const categoryValidation = {
  createCategoryValidationSchema,
};
