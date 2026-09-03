import { Types } from "mongoose";
import { generateUniqueSlug as uniqueSlug } from "../../utils/slug";
import { TCategoryDocument, TCategoryNode } from "./category.interface";
import { Category } from "./category.model";

export { slugify } from "../../utils/slug";

export const generateUniqueSlug = (
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => uniqueSlug(Category, "category", name, excludeId, taken);

/**
 * Nests children under their parent. Port of the legacy
 * `readyToParentAndChildrenCategory`, but grouped in one pass and comparing
 * ObjectIds by string rather than the legacy `==`.
 */
export const buildCategoryTree = (
  categories: TCategoryDocument[],
): TCategoryNode[] => {
  const ROOT = "root";
  const childrenByParent = new Map<string, TCategoryDocument[]>();

  categories.forEach((category) => {
    const key = category.parentId ? category.parentId.toString() : ROOT;
    const siblings = childrenByParent.get(key);
    if (siblings) {
      siblings.push(category);
    } else {
      childrenByParent.set(key, [category]);
    }
  });

  const toNodes = (parentKey: string): TCategoryNode[] =>
    (childrenByParent.get(parentKey) ?? []).map((category) => ({
      _id: category._id,
      name: category.name,
      description: category.description,
      slug: category.slug,
      parentId: category.parentId,
      parentName: category.parentName,
      icon: category.icon,
      status: category.status,
      children: toNodes(category._id.toString()),
    }));

  return toNodes(ROOT);
};

/**
 * Every descendant of the given roots, the roots included. The legacy delete only
 * reached one level of children, so grandchildren were left orphaned.
 */
export const collectCategoryAndDescendantIds = async (
  rootIds: Types.ObjectId[],
): Promise<Types.ObjectId[]> => {
  const collected = new Map<string, Types.ObjectId>();
  let frontier = rootIds;

  rootIds.forEach((id) => collected.set(id.toString(), id));

  while (frontier.length) {
    const children = await Category.find({
      parentId: { $in: frontier },
    }).select("_id");

    // Filtering against `collected` also stops a cycle in existing data from
    // looping here forever.
    frontier = children
      .map((child) => child._id)
      .filter((id) => !collected.has(id.toString()));

    frontier.forEach((id) => collected.set(id.toString(), id));
  }

  return [...collected.values()];
};
