import { Types } from "mongoose";

import { TAttribute } from "../attribute/attribute.interface";
import { Attribute } from "../attribute/attribute.model";
import { TProduct, TProductVariant } from "../product/product.interface";
import { TCartLineOption } from "./cart.interface";

type TAttributeLabels = Map<string, TCartLineOption>;

export const lineKey = (
  product: Types.ObjectId | string,
  variant: Types.ObjectId | string | null,
): string => `${product.toString()}:${variant ? variant.toString() : ""}`;

export const toObjectId = (
  id: string | null | undefined,
): Types.ObjectId | null =>
  id && Types.ObjectId.isValid(id) ? new Types.ObjectId(id) : null;

export const loadOptionLabels = async (
  products: TProduct[],
): Promise<TAttributeLabels> => {
  const attributeIds = new Set<string>();

  for (const product of products) {
    for (const variant of product.variants ?? []) {
      for (const option of variant.options ?? []) {
        attributeIds.add(option.attributeId.toString());
      }
    }
  }

  const labels: TAttributeLabels = new Map();

  if (attributeIds.size === 0) {
    return labels;
  }

  const attributes = await Attribute.find({ _id: { $in: [...attributeIds] } })
    .select("name values")
    .lean<Pick<TAttribute, "name" | "values">[]>();

  for (const attribute of attributes) {
    for (const value of attribute.values ?? []) {
      labels.set(value._id.toString(), {
        attribute: attribute.name,
        value: value.name,
      });
    }
  }

  return labels;
};

export const optionsOf = (
  variant: TProductVariant | null,
  labels: TAttributeLabels,
): TCartLineOption[] =>
  (variant?.options ?? [])
    .map((option) => labels.get(option.valueId.toString()))
    .filter((option): option is TCartLineOption => option !== undefined);

export const imageOf = (
  product: TProduct,
  variant: TProductVariant | null,
): string => variant?.image || product.images?.[0] || "";
