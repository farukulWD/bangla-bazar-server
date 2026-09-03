import { NextFunction, Request, Response } from "express";
import httpStatus from "http-status";
import { Types } from "mongoose";
import AppError from "../../errors/AppError";
import { TCategoryDocument, TCategoryNode } from "./category.interface";
import { Category } from "./category.model";

export const slugify = (name: string): string =>
  name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");

/**
 * `slug` carries a unique index, so a second "Baby Food" becomes `baby-food-2`.
 * `excludeId` keeps a category from colliding with itself on update; `taken` covers
 * slugs claimed earlier in the same bulk batch, which are not in the database yet.
 */
export const generateUniqueSlug = async (
  name: string,
  excludeId?: Types.ObjectId | string,
  taken?: Set<string>,
): Promise<string> => {
  const base = slugify(name) || "category";

  for (let suffix = 1; ; suffix += 1) {
    const candidate = suffix === 1 ? base : `${base}-${suffix}`;

    if (taken?.has(candidate)) {
      continue;
    }

    const clash = await Category.findOne({
      slug: candidate,
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).select("_id");

    if (!clash) {
      return candidate;
    }
  }
};

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

/**
 * A multipart request carries its JSON payload in a `data` field. Parsed here so a
 * malformed body surfaces as a 400 rather than a raw SyntaxError 500.
 */
export const parseFormData = (
  req: Request,
  _res: Response,
  next: NextFunction,
) => {
  if (typeof req.body?.data !== "string") {
    return next();
  }

  try {
    req.body = JSON.parse(req.body.data);
  } catch {
    return next(
      new AppError(httpStatus.BAD_REQUEST, "The `data` field is not valid JSON"),
    );
  }

  next();
};
