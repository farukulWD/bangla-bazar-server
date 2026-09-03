import { Types } from "mongoose";
import { generateUniqueSlug as uniqueSlug } from "../../utils/slug";
import {
  TAttributeDocument,
  TAttributeResponse,
  TAttributeValue,
} from "./attribute.interface";
import { Attribute } from "./attribute.model";

export { slugify } from "../../utils/slug";

export const generateUniqueSlug = (
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => uniqueSlug(Attribute, "attribute", name, excludeId, taken);

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
