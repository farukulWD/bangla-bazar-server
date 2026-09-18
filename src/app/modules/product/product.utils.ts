import { Types } from "mongoose";
import { generateUniqueSlug as uniqueSlug } from "../../utils/slug";
import { Product } from "./product.model";
import {
  TProductDocument,
  TProductResponse,
  TProductVariant,
  TVariantOption,
} from "./product.interface";

export { slugify } from "../../utils/slug";

export const generateUniqueSlug = (
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => uniqueSlug(Product, "product", name, excludeId, taken);

export const deriveDiscount = (originalPrice: number, price: number): number =>
  Math.max(0, originalPrice - price);

export const liveVariants = (variants: TProductVariant[]): TProductVariant[] =>
  variants.filter((variant) => variant.isDeleted !== true);

export const variantKey = (options: TVariantOption[]): string =>
  options
    .map(
      (option) =>
        `${option.attributeId.toString()}:${option.valueId.toString()}`,
    )
    .sort()
    .join("|");

export const toProductResponse = (
  product: TProductDocument,
): TProductResponse => {
  const plain = product.toObject({ versionKey: false }) as TProductResponse;

  return { ...plain, variants: liveVariants(plain.variants ?? []) };
};
