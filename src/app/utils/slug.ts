import { Model, Types } from "mongoose";

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const generateUniqueSlug = async (
  model: Model<any>,
  fallback: string,
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => {
  const base = slugify(name) || fallback;

  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;

    if (taken?.has(candidate)) {
      continue;
    }

    const clash = await model
      .findOne({
        slug: candidate,
        ...(excludeId ? { _id: { $ne: excludeId } } : {}),
      })
      .select("_id");

    if (!clash) {
      return candidate;
    }
  }
};
