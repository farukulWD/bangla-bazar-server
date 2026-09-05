/**
 * Seeds the demo catalogue that used to live in the legacy `script/seed.js`
 * pipeline (legacy-shaped inserts followed by `migrate:products`). The fixtures
 * in ./data are already in the current model shapes, so this script only writes.
 *
 *   pnpm seed:demo [--only=products,orders] [--dry-run] [--force]
 *
 * Rows are upserted by _id, so re-running is idempotent. Existing users are left
 * alone unless --force, since overwriting one resets its password.
 */
import fs from "fs";
import mongoose from "mongoose";
import path from "path";

import config from "../app/config";
import { Attribute } from "../app/modules/attribute/attribute.model";
import { Category } from "../app/modules/category/category.model";
import { Coupon } from "../app/modules/coupon/coupon.model";
import {
  ORDER_COUNTER_ID,
  ORDER_INVOICE_SEED,
} from "../app/modules/order/order.constant";
import { Order, OrderCounter } from "../app/modules/order/order.model";
import { Product } from "../app/modules/product/product.model";
import { Role } from "../app/modules/roles/roles.model";
import { User } from "../app/modules/users/user.model";
import connectDB from "../app/utils/db";

const DATA_DIR = path.join(__dirname, "data");

const DATASETS = [
  "attributes",
  "categories",
  "products",
  "coupons",
  "users",
  "orders",
] as const;

type TDataset = (typeof DATASETS)[number];

type TSeedUser = {
  _id: string;
  name: string;
  email: string;
  phone: string;
  password: string;
  userType: string;
  roleName: string | null;
  legacyTitle?: string;
  image?: string;
  address?: string;
  country?: string;
  city?: string;
  status: string;
  isEmailVerify: boolean;
  isPhoneVerify: boolean;
};

type TSeedOrder = {
  _id: string;
  invoice: number;
  status: string;
  paymentStatus: string;
  /** How far back to date the order, so dashboard lists have a spread to sort. */
  daysAgo: number;
  [key: string]: unknown;
};

type TSeedCoupon = {
  _id: string;
  endTime: string;
  [key: string]: unknown;
};

const read = <T>(dataset: TDataset): T[] =>
  JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${dataset}.json`), "utf8"));

const argv = process.argv.slice(2);
const dryRun = argv.includes("--dry-run");
const force = argv.includes("--force");

const only = (() => {
  const flag = argv.find((arg) => arg.startsWith("--only="));
  if (!flag) return new Set<TDataset>(DATASETS);

  const names = flag
    .slice("--only=".length)
    .split(",")
    .map((name) => name.trim())
    .filter(Boolean);

  const unknown = names.filter(
    (name) => !DATASETS.includes(name as TDataset),
  );
  if (unknown.length) {
    throw new Error(
      `Unknown dataset(s): ${unknown.join(", ")}. Known: ${DATASETS.join(", ")}`,
    );
  }

  return new Set(names as TDataset[]);
})();

const DAY_MS = 24 * 60 * 60 * 1000;
/** Fixture coupons all expired years ago; a demo coupon that cannot apply is noise. */
const COUPON_EXTENSION_DAYS = 90;

const log = (line: string) => console.log(line);

/**
 * Every dataset but users goes through here. `timestamps: false` keeps the
 * createdAt the fixture chose instead of stamping the seed run over it.
 */
const upsertAll = async (
  model: mongoose.Model<any>,
  rows: Record<string, unknown>[],
): Promise<number> => {
  let written = 0;

  for (const { _id, ...fields } of rows) {
    await model.updateOne(
      { _id },
      { $set: fields },
      { upsert: true, timestamps: false },
    );
    written += 1;
  }

  return written;
};

const seedUsers = async (rows: TSeedUser[]) => {
  const roles = await Role.find({ isDeleted: { $ne: true } })
    .select("name")
    .lean<{ _id: mongoose.Types.ObjectId; name: string }[]>();
  const roleIdByName = new Map(roles.map((role) => [role.name, role._id]));

  const missingRoles = new Set<string>();
  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const existing = await User.findById(row._id);

    if (existing && !force) {
      skipped += 1;
      continue;
    }

    if (row.roleName && !roleIdByName.has(row.roleName)) {
      missingRoles.add(row.roleName);
    }

    const doc = existing ?? new User({ _id: row._id });

    doc.set({
      name: row.name,
      email: row.email,
      phone: row.phone,
      userType: row.userType,
      role: row.roleName ? (roleIdByName.get(row.roleName) ?? null) : null,
      image: row.image,
      address: row.address,
      country: row.country,
      city: row.city,
      status: row.status,
      isEmailVerify: row.isEmailVerify,
      isPhoneVerify: row.isPhoneVerify,
      isDeleted: false,
    });

    // Assigned separately and in plaintext: the model's pre-save hook bcrypts it.
    doc.password = row.password;

    await doc.save();
    existing ? (updated += 1) : (created += 1);
  }

  if (missingRoles.size) {
    log(
      `  ! no Role named ${[...missingRoles].join(", ")} — those staff have role: null. Run pnpm seed:roles first.`,
    );
  }

  return { created, updated, skipped };
};

const seedOrders = async (rows: TSeedOrder[]) => {
  const now = Date.now();

  for (const { daysAgo, ...order } of rows) {
    const placedAt = new Date(now - daysAgo * DAY_MS);
    const settledAt = new Date(placedAt.getTime() + 2 * DAY_MS);
    const isDelivered = order.status === "delivered";

    const { _id, ...fields } = order;

    await Order.updateOne(
      { _id },
      {
        $set: {
          ...fields,
          statusHistory: [
            { status: "pending", at: placedAt, by: null },
            ...(isDelivered
              ? [{ status: "delivered" as const, at: settledAt, by: null }]
              : []),
          ],
          paidAt: order.paymentStatus === "paid" ? settledAt : null,
          deliveredAt: isDelivered ? settledAt : null,
          cancelledAt: null,
          stockRestoredAt: null,
          createdAt: placedAt,
          updatedAt: settledAt,
        },
      },
      { upsert: true, timestamps: false },
    );
  }

  // nextInvoice() hands out seq + 1, so the counter has to sit at or above the
  // highest seeded invoice or the first real order collides on the unique index.
  const highest = rows.reduce(
    (max, row) => Math.max(max, row.invoice),
    ORDER_INVOICE_SEED,
  );

  await OrderCounter.updateOne(
    { _id: ORDER_COUNTER_ID },
    { $max: { seq: highest } },
    { upsert: true },
  );

  return { written: rows.length, counter: highest };
};

const run = async () => {
  if (config.node_environment === "production" && !force) {
    throw new Error(
      "Refusing to seed demo data in production. Pass --force if you truly mean it.",
    );
  }

  const counts: Record<string, number> = {};
  for (const dataset of DATASETS) {
    if (only.has(dataset)) counts[dataset] = read(dataset).length;
  }

  log(
    `Datasets: ${Object.entries(counts)
      .map(([name, count]) => `${name}=${count}`)
      .join(" ")}`,
  );

  if (dryRun) {
    log(
      `--dry-run: ${Object.values(counts).reduce((sum, n) => sum + n, 0)} row(s) would be written. Nothing was written.`,
    );
    return;
  }

  await connectDB();

  // Order matters: products reference categories and attribute values, orders
  // reference products and users.
  if (only.has("attributes")) {
    const written = await upsertAll(Attribute, read("attributes"));
    log(`  attributes  ${written}`);
  }

  if (only.has("categories")) {
    const written = await upsertAll(Category, read("categories"));
    log(`  categories  ${written}`);
  }

  if (only.has("products")) {
    const written = await upsertAll(Product, read("products"));
    log(`  products    ${written}`);
  }

  if (only.has("coupons")) {
    const rows = read<TSeedCoupon>("coupons").map((row) => {
      const endTime = new Date(row.endTime);
      return endTime.getTime() > Date.now()
        ? row
        : {
            ...row,
            endTime: new Date(
              Date.now() + COUPON_EXTENSION_DAYS * DAY_MS,
            ).toISOString(),
          };
    });

    const written = await upsertAll(Coupon, rows);
    log(`  coupons     ${written}`);
  }

  if (only.has("users")) {
    const { created, updated, skipped } = await seedUsers(read<TSeedUser>("users"));
    log(
      `  users       ${created} created, ${updated} updated, ${skipped} left alone${
        skipped ? " (--force overwrites, resetting passwords)" : ""
      }`,
    );
  }

  if (only.has("orders")) {
    const { written, counter } = await seedOrders(read<TSeedOrder>("orders"));
    log(`  orders      ${written} (invoice counter at ${counter})`);
  }

  log("\nDemo data seeded. Staff and customer logins use the password 12345678.");
};

run()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    if (mongoose.connection.readyState) {
      await mongoose.disconnect();
    }
  });
