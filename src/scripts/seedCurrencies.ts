import mongoose from "mongoose";

import { Currency } from "../app/modules/currency/currency.model";
import { TCreateCurrency } from "../app/modules/currency/currency.interface";
import connectDB from "../app/utils/db";

const SEED: (TCreateCurrency & { isBase?: boolean })[] = [
  {
    code: "BDT",
    name: "Bangladeshi Taka",
    symbol: "৳",
    symbolPosition: "before",
    decimals: 2,
    rate: 1,
    status: "active",
    isBase: true,
  },
];

const run = async () => {
  const force = process.argv.includes("--force");
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const existing = await Currency.find({ isDeleted: { $ne: true } })
    .select("code isBase")
    .lean<{ code: string; isBase: boolean }[]>();

  const known = new Set(existing.map((row) => row.code));
  const hasBase = existing.some((row) => row.isBase);

  const toAdd = SEED.filter((row) => !known.has(row.code));

  if (!toAdd.length && !force) {
    console.log("Currencies are already seeded — nothing to add.");
    return;
  }

  for (const row of force ? SEED : toAdd) {
    const verb = known.has(row.code) ? "reset" : "add";
    console.log(
      `  ${verb === "add" ? "+" : "~"} ${row.code} ${row.symbol} rate=${row.rate}${
        row.isBase ? " (base)" : ""
      }`,
    );
  }

  if (dryRun) {
    console.log(
      `--dry-run: ${(force ? SEED : toAdd).length} currency row(s) would be written.`,
    );
    return;
  }

  for (const { isBase, ...row } of force ? SEED : toAdd) {
    // The base flag is only claimed when nothing holds it: re-seeding must never
    // silently move the base out from under a shop's stored prices.
    const claimsBase = Boolean(isBase) && !hasBase;

    await Currency.findOneAndUpdate(
      { code: row.code, isDeleted: { $ne: true } },
      {
        $set: {
          ...row,
          ...(claimsBase ? { isBase: true, rate: 1, status: "active" } : {}),
          rateUpdatedAt: new Date(),
        },
      },
      { upsert: true, runValidators: true, setDefaultsOnInsert: true },
    );
  }

  if (hasBase) {
    console.log("A base currency was already set — left untouched.");
  }

  console.log(`${(force ? SEED : toAdd).length} currency row(s) written.`);
};

run()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
