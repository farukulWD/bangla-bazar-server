import { Types } from "mongoose";
import {
  TAttributeDocument,
  TAttributeResponse,
  TAttributeValue,
} from "./attribute.interface";
import { Attribute } from "./attribute.model";

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

export const generateUniqueSlug = async (
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => {
  const base = slugify(name) || "attribute";

  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;

    if (taken?.has(candidate)) {
      continue;
    }

    const clash = await Attribute.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");

    if (!clash) {
      return candidate;
    }
  }
};

export const toAttributeResponse = (
  attribute: TAttributeDocument,
  options: { onlyShowingValues?: boolean } = {},
): TAttributeResponse => {
  const plain = attribute.toObject({ versionKey: false }) as TAttributeResponse;
  const values: TAttributeValue[] = (plain.values ?? []).filter(
    (value) =>
      value.isDeleted !== true &&
      (!options.onlyShowingValues || value.status === "show"),
  );

  return { ...plain, values };
};
