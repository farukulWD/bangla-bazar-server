import mongoose from "mongoose";
import { slugify } from "../app/utils/slug";
import connectDB from "../app/utils/db";

const OBJECT_ID = /^[0-9a-fA-F]{24}$/;

type TLegacyVariant = Record<string, unknown>;

const firstString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    return value.trim() || undefined;
  }

  if (value && typeof value === "object") {
    const map = value as Record<string, unknown>;
    const preferred = map.en;
    if (typeof preferred === "string" && preferred.trim()) {
      return preferred.trim();
    }

    for (const entry of Object.values(map)) {
      if (typeof entry === "string" && entry.trim()) {
        return entry.trim();
      }
    }
  }

  return undefined;
};

/** Legacy seeds stored the tag array as a JSON string inside a one-element array. */
const normaliseTags = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((entry) => {
    if (typeof entry !== "string") {
      return [];
    }

    if (entry.startsWith("[")) {
      try {
        const parsed = JSON.parse(entry);
        return Array.isArray(parsed)
          ? parsed.filter((tag): tag is string => typeof tag === "string")
          : [];
      } catch {
        return [entry];
      }
    }

    return [entry];
  });
};

const toCategoryId = (value: unknown): mongoose.Types.ObjectId | undefined => {
  if (value instanceof mongoose.Types.ObjectId) {
    return value;
  }

  if (typeof value === "string" && OBJECT_ID.test(value)) {
    return new mongoose.Types.ObjectId(value);
  }

  if (value && typeof value === "object" && "_id" in value) {
    return toCategoryId((value as { _id: unknown })._id);
  }

  return undefined;
};

const stripUndefined = <T extends Record<string, unknown>>(value: T): T =>
  Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;

const toNumber = (value: unknown, fallback = 0): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const convertVariant = (legacy: TLegacyVariant) => {
  const options: {
    attributeId: mongoose.Types.ObjectId;
    valueId: mongoose.Types.ObjectId;
  }[] = [];

  for (const [key, value] of Object.entries(legacy)) {
    if (!OBJECT_ID.test(key)) {
      continue;
    }

    const valueId = typeof value === "string" ? value : String(value ?? "");
    if (!OBJECT_ID.test(valueId)) {
      continue;
    }

    options.push({
      attributeId: new mongoose.Types.ObjectId(key),
      valueId: new mongoose.Types.ObjectId(valueId),
    });
  }

  const originalPrice = toNumber(legacy.originalPrice);
  const price = toNumber(legacy.price, originalPrice);

  return stripUndefined({
    _id: new mongoose.Types.ObjectId(),
    options,
    sku: typeof legacy.sku === "string" && legacy.sku ? legacy.sku : undefined,
    barcode:
      typeof legacy.barcode === "string" && legacy.barcode
        ? legacy.barcode
        : undefined,
    originalPrice,
    price,
    discount: Math.max(0, originalPrice - price),
    stock: toNumber(legacy.quantity ?? legacy.stock),
    image:
      typeof legacy.image === "string" && legacy.image
        ? legacy.image
        : undefined,
    isDeleted: false,
  });
};

const run = async () => {
  const dryRun = process.argv.includes("--dry-run");

  await connectDB();

  const collection = mongoose.connection.collection("products");
  const documents = await collection.find({}).toArray();

  const claimedSlugs = new Set<string>();
  let migrated = 0;
  let skipped = 0;

  for (const legacy of documents) {
    const title = firstString(legacy.title);

    if (!title) {
      skipped += 1;
      console.warn(`Skipped ${legacy._id.toString()}: it has no usable title.`);
      continue;
    }

    const variants = Array.isArray(legacy.variants)
      ? (legacy.variants as TLegacyVariant[])
          .map(convertVariant)
          .filter((variant) => variant.options.length > 0)
      : [];

    const isCombination = variants.length > 0;
    const originalPrice = toNumber(
      (legacy.prices as Record<string, unknown>)?.originalPrice,
    );
    const price = toNumber(
      (legacy.prices as Record<string, unknown>)?.price,
      originalPrice,
    );

    const base = slugify(firstString(legacy.slug) ?? title) || "product";
    let slug = base;
    for (let suffix = 2; claimedSlugs.has(slug); suffix += 1) {
      slug = `${base}-${suffix}`;
    }
    claimedSlugs.add(slug);

    const categories = (
      Array.isArray(legacy.categories) ? legacy.categories : []
    )
      .map(toCategoryId)
      .filter((id): id is mongoose.Types.ObjectId => Boolean(id));
    const category = toCategoryId(legacy.category) ?? categories[0];

    if (!category) {
      skipped += 1;
      console.warn(`Skipped ${legacy._id.toString()}: it has no category.`);
      continue;
    }

    const unset: Record<string, ""> = { image: "", tag: "", productId: "" };
    const sku = firstString(legacy.sku);
    const barcode = firstString(legacy.barcode);
    if (!sku) unset.sku = "";
    if (!barcode) unset.barcode = "";

    const update = {
      $set: stripUndefined({
        title,
        description: firstString(legacy.description),
        slug,
        category,
        categories: categories.length ? categories : [category],
        images: Array.isArray(legacy.image) ? legacy.image : [],
        imageStatus: "ready",
        tags: normaliseTags(legacy.tag),
        prices: {
          originalPrice,
          price,
          discount: Math.max(0, originalPrice - price),
        },
        stock: isCombination
          ? variants.reduce((sum, variant) => sum + variant.stock, 0)
          : toNumber(legacy.stock),
        sales: toNumber(legacy.sales),
        isCombination,
        variants,
        status: legacy.status === "hide" ? "hide" : "show",
        isDeleted: legacy.isDeleted === true,
        sku,
        barcode,
      }),
      $unset: unset,
    };

    if (!dryRun) {
      await collection.updateOne({ _id: legacy._id }, update);
    }

    migrated += 1;
  }

  console.log(
    dryRun
      ? `--dry-run: ${migrated} product(s) would be migrated, ${skipped} skipped. Nothing was written.`
      : `${migrated} product(s) migrated, ${skipped} skipped.`,
  );
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
