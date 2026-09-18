import mongoose, { Schema } from "mongoose";

import {
  SETTINGS_DOC_KEY,
  SETTINGS_GROUPS,
} from "../app/modules/settings/settings.constant";
import { SETTINGS_DEFAULTS } from "../app/modules/settings/settings.defaults";
import { TSettings } from "../app/modules/settings/settings.interface";
import { Settings } from "../app/modules/settings/settings.model";
import { toDotPaths } from "../app/modules/settings/settings.utils";
import connectDB from "../app/utils/db";

const undeclaredPaths = (): string[] => {
  const declared = new Set<string>();

  const walk = (schema: Schema, prefix: string): void => {
    schema.eachPath((path, type) => {
      const full = prefix ? `${prefix}.${path}` : path;
      declared.add(full);
      const child = (type as { schema?: Schema }).schema;
      if (child) {
        walk(child, full);
      }
    });
  };

  walk(Settings.schema, "");

  return Object.keys(toDotPaths("", SETTINGS_DEFAULTS)).filter(
    (path) => !path.startsWith("storefront.") && !declared.has(path),
  );
};

const run = async () => {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const undeclared = undeclaredPaths();
  if (undeclared.length) {
    console.warn(
      `Warning: ${undeclared.length} default path(s) are missing from the Mongoose schema in settings.model.ts:`,
    );
    for (const path of undeclared) {
      console.warn(`  ! ${path}`);
    }
  }

  const stored = await Settings.findOne({
    key: SETTINGS_DOC_KEY,
  }).lean<TSettings | null>();

  if (force) {
    console.log(
      dryRun
        ? "--dry-run: every group would be reset to its shipped defaults."
        : "Resetting every group to its shipped defaults.",
    );

    if (!dryRun) {
      await Settings.findOneAndUpdate(
        { key: SETTINGS_DOC_KEY },
        { $set: SETTINGS_DEFAULTS },
        { upsert: true, strict: false },
      );
    }
    return;
  }

  const defaultPaths = toDotPaths("", SETTINGS_DEFAULTS);
  const storedPaths = stored
    ? toDotPaths("", {
        store: stored.store,
        checkout: stored.checkout,
        integrations: stored.integrations,
        storefront: stored.storefront,
      })
    : {};

  const missing = Object.fromEntries(
    Object.entries(defaultPaths).filter(
      ([path]) => storedPaths[path] === undefined,
    ),
  );

  const paths = Object.keys(missing);

  if (paths.length === 0) {
    console.log("Settings are already complete — nothing to add.");
    return;
  }

  const byGroup = new Map<string, number>();
  for (const path of paths) {
    const group = path.split(".")[0];
    byGroup.set(group, (byGroup.get(group) ?? 0) + 1);
  }

  for (const group of SETTINGS_GROUPS) {
    const count = byGroup.get(group) ?? 0;
    console.log(`${group.padEnd(14)} ${count} field(s) to add`);
  }

  // Verbose enough to be worth reading, short enough not to bury the summary.
  for (const path of paths.slice(0, 25)) {
    console.log(`  + ${path} = ${JSON.stringify(missing[path])}`);
  }
  if (paths.length > 25) {
    console.log(`  … and ${paths.length - 25} more`);
  }

  if (dryRun) {
    console.log(
      `--dry-run: ${paths.length} field(s) would be added, nothing was written.`,
    );
    return;
  }

  await Settings.findOneAndUpdate(
    { key: SETTINGS_DOC_KEY },
    { $set: missing },
    { upsert: true, strict: false },
  );

  console.log(`${paths.length} field(s) added.`);
};

run()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
