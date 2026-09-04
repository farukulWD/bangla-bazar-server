import mongoose from "mongoose";

import { Currency } from "../app/modules/currency/currency.model";
import { TCurrency } from "../app/modules/currency/currency.interface";
import { Order } from "../app/modules/order/order.model";
import { TOrderCurrency } from "../app/modules/order/order.interface";
import { FALLBACK_MONEY_FORMAT } from "../app/utils/money";
import connectDB from "../app/utils/db";

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const base = await Currency.findOne({
    isBase: true,
    isDeleted: { $ne: true },
  }).lean<TCurrency | null>();

  const stamp: TOrderCurrency = base
    ? {
        code: base.code,
        symbol: base.symbol,
        symbolPosition: base.symbolPosition,
        decimals: base.decimals,
        thousandSeparator: base.thousandSeparator,
        decimalSeparator: base.decimalSeparator,
      }
    : { ...FALLBACK_MONEY_FORMAT };

  const filter = { currency: { $exists: false } };
  const pending = await Order.countDocuments(filter);

  if (!pending) {
    console.log("Every order already carries a currency — nothing to do.");
    return;
  }

  console.log(
    `${pending} order(s) to stamp with ${stamp.code} (${stamp.symbol}, ${stamp.decimals} decimals).`,
  );

  if (dryRun) {
    console.log("--dry-run: nothing was written.");
    return;
  }

  const result = await Order.updateMany(filter, { $set: { currency: stamp } });

  console.log(`${result.modifiedCount} order(s) migrated.`);
};

run()
  .catch((err) => {
    console.error(
      "Migration failed:",
      err instanceof Error ? err.message : err,
    );
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
