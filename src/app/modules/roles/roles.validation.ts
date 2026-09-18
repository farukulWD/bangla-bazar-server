import z from "zod";
import {
  PermissionModule,
  isValidPermission,
} from "../../constants/permissions";

const objectId = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid id");

const idParams = z.object({ id: objectId });

/**
 * The permission map is stored as Mixed, so nothing but this check stands between
 * a typo and a grant that can never be satisfied.
 */
const roleModuleSchema = z
  .object({
    module: z.enum(PermissionModule),
    permissions: z.record(z.string(), z.boolean()).default({}),
  })
  .superRefine((value, ctx) => {
    Object.keys(value.permissions).forEach((permission) => {
      if (!isValidPermission(value.module, permission)) {
        ctx.addIssue({
          code: "custom",
          path: ["permissions", permission],
          message: `"${permission}" is not a permission of the "${value.module}" module`,
        });
      }
    });
  });

const modulesSchema = z.array(roleModuleSchema).superRefine((modules, ctx) => {
  const seen = new Set<string>();

  modules.forEach((entry, index) => {
    if (seen.has(entry.module)) {
      ctx.addIssue({
        code: "custom",
        path: [index, "module"],
        message: `"${entry.module}" appears more than once`,
      });
    }
    seen.add(entry.module);
  });
});

// Every schema is wrapped in `body`: validateRequest parses
// `{ body: req.body, cookies: req.cookies, params: req.params, query: req.query }`.
export const createRoleSchema = z.object({
  body: z.object({
    name: z.string().trim().min(2, "Role name is required"),
    description: z.string().trim().optional(),
    modules: modulesSchema.optional(),
  }),
});

export const updateRoleSchema = z.object({
  params: idParams,
  body: z.object({
    name: z.string().trim().min(2).optional(),
    description: z.string().trim().optional(),
    modules: modulesSchema.optional(),
    isActive: z.boolean().optional(),
  }),
});

export const idParamSchema = z.object({
  params: idParams,
});
