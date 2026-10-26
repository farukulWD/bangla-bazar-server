import z from "zod";
import { UserType } from "./user.interface";
import { CUSTOMER_BULK_MAX } from "./user.constant";
const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const status = z.enum(["active", "inactive"]);

// Every schema is wrapped in `body`: validateRequest parses
// `{ body: req.body, cookies: req.cookies }`, not the body on its own.
export const createStaffUserSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name is required"),
      email: z.string().trim().email("A valid email is required").optional(),
      phone: z.string().trim().optional(),
      password: z.string().min(8, "Password must be at least 8 characters"),
      userType: z.literal(UserType.Admin).optional(),
      role: objectId.nullable().optional(),
    })
    .refine((value) => Boolean(value.email || value.phone), {
      message: "Provide an email address or a phone number",
      path: ["email"],
    }),
});

export const updateStaffUserSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2).optional(),
    role: objectId.nullable().optional(),
    status: status.optional(),
  }),
});

export const promoteUserSchema = z.object({
  body: z.object({
    role: objectId,
  }),
});

export const setUserStatusSchema = z.object({
  body: z.object({
    status,
  }),
});

const customerIds = z
  .array(objectId)
  .min(1, "Select at least one customer")
  .max(
    CUSTOMER_BULK_MAX,
    `Select at most ${CUSTOMER_BULK_MAX} customers at a time`,
  );

export const bulkCustomerStatusSchema = z.object({
  body: z.object({
    ids: customerIds,
    status,
  }),
});

export const bulkDeleteCustomersSchema = z.object({
  body: z.object({
    ids: customerIds,
  }),
});

export const updateMeSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Name is required").optional(),
    address: z.string().trim().optional(),
    country: z.string().trim().optional(),
    city: z.string().trim().optional(),
  }),
});
