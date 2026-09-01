import mongoose from "mongoose";
import {
  CategoryPermission,
  PERMISSION_MODULES,
  PermissionModule,
  TAnyPermission,
  UserPermission,
  isValidPermission,
  permissionsOfModule,
} from "../app/constants/permissions";
import {
  TPermissionMap,
  TRoleModule,
} from "../app/modules/roles/roles.interface";
import { Role } from "../app/modules/roles/roles.model";
import connectDB from "../app/utils/db";

/**
 * Two jobs:
 *
 *   npm run seed:roles         create the baseline roles on a fresh database
 *   npm run sync:permissions   reconcile every stored role with the catalogue
 *
 * The second is the one to run after touching `constants/permissions.ts`:
 * permissions live in code, grants live in Mongo, and nothing keeps them in step
 * on its own. A new permission never reaches the full-access role, and a retired
 * one lingers in the stored map until `updateRoleSchema` rejects the next edit
 * of that role.
 *
 * Flags: --force (overwrite a baseline role), --sync, --dry-run.
 */

/** Roles that are meant to hold everything, and so are topped up by --sync. */
const FULL_ACCESS_ROLES = ["admin"];

const allPermissions = (): TRoleModule[] =>
  PERMISSION_MODULES.map((module) => ({
    module,
    permissions: Object.fromEntries(
      permissionsOfModule(module).map((key) => [key, true]),
    ) as TPermissionMap,
  }));

const catalogManagerPermissions = (): TRoleModule[] => [
  {
    module: PermissionModule.Category,
    permissions: {
      [CategoryPermission.ViewCategories]: true,
      [CategoryPermission.AddCategory]: true,
      [CategoryPermission.EditCategory]: true,
      [CategoryPermission.PublishCategory]: true,
    },
  },
];

const supportPermissions = (): TRoleModule[] => [
  {
    module: PermissionModule.User,
    permissions: {
      [UserPermission.ViewUsers]: true,
    },
  },
];

const seeds = [
  {
    name: "admin",
    description:
      "Full access to every module, including user management and roles.",
    modules: allPermissions,
  },
  {
    name: "catalog-manager",
    description:
      "Maintains the category tree — creates, edits, publishes and hides categories. Cannot delete one, and cannot touch users or roles.",
    modules: catalogManagerPermissions,
  },
  {
    name: "support",
    description:
      "Reads the user list to answer questions. Changes nothing.",
    modules: supportPermissions,
  },
];

const countGrants = (modules: TRoleModule[]): number =>
  modules.reduce((sum, entry) => sum + Object.keys(entry.permissions).length, 0);

const seedRoles = async (force: boolean) => {
  for (const seed of seeds) {
    const modules = seed.modules();
    const existing = await Role.findOne({ name: seed.name });

    if (!existing) {
      await Role.create({ ...seed, modules, isActive: true });
      console.log(
        `created "${seed.name}" — ${countGrants(modules)} permissions across ${modules.length} module(s)`,
      );
      continue;
    }

    if (!force) {
      console.log(
        `"${seed.name}" already exists. Re-run with --force to overwrite its permissions.`,
      );
      continue;
    }

    existing.description = seed.description;
    existing.set("modules", modules);
    await existing.save();
    console.log(`updated "${seed.name}"`);
  }
};

/**
 * Prunes what the catalogue no longer defines, and — for a full-access role —
 * grants what it has gained. A permission a role holds as an explicit `false` is
 * left alone: somebody revoked it on purpose.
 */
const syncPermissions = async (dryRun: boolean) => {
  const roles = await Role.find();

  if (!roles.length) {
    console.log("No roles to sync. Run `npm run seed:roles` first.");
    return;
  }

  let changedRoles = 0;

  for (const role of roles) {
    const granted: string[] = [];
    const pruned: string[] = [];
    const modules: TRoleModule[] = [];

    for (const entry of role.modules ?? []) {
      if (!PERMISSION_MODULES.includes(entry.module)) {
        pruned.push(`${entry.module}.*`);
        continue;
      }

      const permissions: TPermissionMap = {};

      for (const [key, value] of Object.entries(entry.permissions ?? {})) {
        if (!isValidPermission(entry.module, key)) {
          pruned.push(`${entry.module}.${key}`);
          continue;
        }
        permissions[key as TAnyPermission] = value as boolean;
      }

      modules.push({ module: entry.module, permissions });
    }

    if (FULL_ACCESS_ROLES.includes(role.name)) {
      for (const module of PERMISSION_MODULES) {
        let entry = modules.find((candidate) => candidate.module === module);

        if (!entry) {
          entry = { module, permissions: {} };
          modules.push(entry);
        }

        for (const key of permissionsOfModule(module)) {
          if (key in entry.permissions) {
            continue;
          }
          entry.permissions[key] = true;
          granted.push(`${module}.${key}`);
        }
      }
    }

    if (!granted.length && !pruned.length) {
      console.log(`"${role.name}" — up to date`);
      continue;
    }

    changedRoles += 1;
    console.log(
      `"${role.name}" — ${granted.length} granted${granted.length ? ` (${granted.join(", ")})` : ""}, ${pruned.length} pruned${pruned.length ? ` (${pruned.join(", ")})` : ""}`,
    );

    if (dryRun) {
      continue;
    }

    role.set("modules", modules);
    await role.save();
  }

  console.log(
    dryRun
      ? `--dry-run: ${changedRoles} role(s) would change, nothing was written.`
      : `${changedRoles} role(s) updated.`,
  );
};

const run = async () => {
  const force = process.argv.includes("--force");
  const sync = process.argv.includes("--sync");
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  if (sync) {
    await syncPermissions(dryRun);
    return;
  }

  if (dryRun) {
    throw new Error("--dry-run is only supported together with --sync");
  }

  await seedRoles(force);
};

run()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
