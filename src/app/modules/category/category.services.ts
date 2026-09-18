import httpStatus from "http-status";
import { Types } from "mongoose";
import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { queueCascadeCategory } from "../../queues/products.queue";
import { sendImageToCloudinary } from "../../utils/sendImageToCloudinary";
import {
  CATEGORY_QUERY_CONTROL_KEYS,
  CATEGORY_SEARCHABLE_FIELDS,
} from "./category.constant";
import {
  TBulkResult,
  TCategoryDocument,
  TCategoryNode,
  TCategoryStatus,
  TCreateCategory,
  TUpdateCategory,
} from "./category.interface";
import { Category } from "./category.model";
import { categoryRowSchema } from "./category.validation";
import {
  buildCategoryTree,
  collectCategoryAndDescendantIds,
  generateUniqueSlug,
} from "./category.utils";

/**
 * Soft deletes are filtered per query rather than by a pre-find hook, matching how
 * the user module handles `isDeleted`.
 */
const NOT_DELETED = { isDeleted: { $ne: true } };

const uploadIcon = async (file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `category-icon-${Date.now()}`,
    file.path,
    file.mimetype,
  );
  return uploadResult.secure_url as string;
};

const findCategoryOrThrow = async (id: string): Promise<TCategoryDocument> => {
  const category = await Category.findOne({ _id: id, ...NOT_DELETED });

  if (!category) {
    throw new AppError(httpStatus.NOT_FOUND, "Category not found");
  }

  return category;
};

/**
 * "" and null both mean "no parent". Anything else must name a live category —
 * `parentName` is denormalised onto the child, so it is read from the parent rather
 * than trusted from the request.
 */
const resolveParent = async (
  parentId: string | null | undefined,
): Promise<{ parentId: Types.ObjectId | null; parentName?: string } | null> => {
  if (parentId === undefined) {
    return null;
  }

  if (parentId === "" || parentId === null) {
    return { parentId: null, parentName: undefined };
  }

  const parent = await Category.findOne({ _id: parentId, ...NOT_DELETED });

  if (!parent) {
    throw new AppError(httpStatus.NOT_FOUND, "Parent category not found");
  }

  return { parentId: parent._id, parentName: parent.name };
};

const createCategory = async (
  payload: TCreateCategory,
  file?: Express.Multer.File,
) => {
  const parent = await resolveParent(payload.parentId);

  const category = await Category.create({
    name: payload.name,
    description: payload.description,
    slug: payload.slug
      ? await generateUniqueSlug(payload.slug)
      : await generateUniqueSlug(payload.name),
    parentId: parent ? parent.parentId : null,
    parentName: parent ? parent.parentName : undefined,
    icon: file ? await uploadIcon(file) : payload.icon,
    status: payload.status,
  });

  return category;
};

/**
 * Row by row rather than `insertMany`: each slug is derived from the name and must
 * be unique, and a collision inside the batch is invisible to a pre-generated list.
 * A failed row is recorded and the rest still land — the legacy `addAllCategory`
 * wiped the whole collection first, which this deliberately does not do.
 */
const bulkCreateCategories = async (
  payload: unknown[],
): Promise<TBulkResult> => {
  const failed: TBulkResult["failed"] = [];
  const claimedSlugs = new Set<string>();
  let succeeded = 0;

  for (const [index, entry] of payload.entries()) {
    // Rows are checked here rather than by validateRequest so that a malformed
    // entry is reported against its index and the rest of the batch still lands.
    const parsed = categoryRowSchema.safeParse(entry);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failed.push({
        index,
        identifier:
          entry && typeof entry === "object" && "name" in entry
            ? String((entry as { name: unknown }).name)
            : undefined,
        error: issue
          ? `${issue.path.join(".") || "row"}: ${issue.message}`
          : "Invalid category",
      });
      continue;
    }

    const row: TCreateCategory = parsed.data;

    try {
      const parent = await resolveParent(row.parentId);
      const slug = await generateUniqueSlug(
        row.slug || row.name,
        undefined,
        claimedSlugs,
      );

      await Category.create({
        name: row.name,
        description: row.description,
        slug,
        parentId: parent ? parent.parentId : null,
        parentName: parent ? parent.parentName : undefined,
        icon: row.icon,
        status: row.status,
      });

      claimedSlugs.add(slug);
      succeeded += 1;
    } catch (error) {
      failed.push({
        index,
        identifier: row.name,
        error: error instanceof Error ? error.message : "Could not be created",
      });
    }
  }

  return { succeeded, failed };
};

const getCategories = async (
  query: Record<string, unknown>,
): Promise<{ data: TCategoryDocument[]; pagination: TPagination }> => {
  const categoryQuery = new QueryBuilder(Category.find(NOT_DELETED), query)
    .search(CATEGORY_SEARCHABLE_FIELDS)
    .filter(CATEGORY_QUERY_CONTROL_KEYS)
    .sort();

  await categoryQuery.paginate();
  categoryQuery.fields();

  const data = await categoryQuery.modelQuery;

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data,
    pagination: {
      page,
      limit,
      total: categoryQuery.total,
      totalPage: Math.ceil(categoryQuery.total / limit),
    },
  };
};

/**
 * The tree endpoints load the whole set rather than a page: a slice of the rows
 * cannot be assembled into a correct hierarchy.
 */
const getCategoryTree = async (): Promise<TCategoryNode[]> => {
  const categories = await Category.find(NOT_DELETED).sort({ createdAt: -1 });
  return buildCategoryTree(categories);
};

const getShowingCategoryTree = async (): Promise<TCategoryNode[]> => {
  const categories = await Category.find({
    ...NOT_DELETED,
    status: "show",
  }).sort({ createdAt: -1 });
  return buildCategoryTree(categories);
};

const getCategoryById = async (id: string) => findCategoryOrThrow(id);

const updateCategory = async (
  id: string,
  payload: TUpdateCategory,
  file?: Express.Multer.File,
) => {
  const category = await findCategoryOrThrow(id);

  const update: Record<string, unknown> = {};

  if (payload.parentId !== undefined) {
    const parent = await resolveParent(payload.parentId);

    if (parent?.parentId) {
      // Reparenting a category under itself or under one of its own descendants
      // would detach that whole branch from the tree.
      const branch = await collectCategoryAndDescendantIds([category._id]);
      const wouldCycle = branch.some(
        (branchId) => branchId.toString() === parent.parentId!.toString(),
      );

      if (wouldCycle) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          "A category cannot be moved under itself or one of its own subcategories",
        );
      }
    }

    update.parentId = parent!.parentId;
    update.parentName = parent!.parentName;
  }

  if (payload.name !== undefined) {
    update.name = payload.name;
    // The slug tracks the name unless the caller sets one explicitly.
    if (payload.slug === undefined) {
      update.slug = await generateUniqueSlug(payload.name, category._id);
    }
  }

  if (payload.slug !== undefined) {
    update.slug = await generateUniqueSlug(payload.slug, category._id);
  }

  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.status !== undefined) update.status = payload.status;

  if (file) {
    update.icon = await uploadIcon(file);
  } else if (payload.icon !== undefined) {
    update.icon = payload.icon;
  }

  return Category.findByIdAndUpdate(category._id, update, {
    new: true,
    runValidators: true,
  });
};

const updateCategoryStatus = async (id: string, status: TCategoryStatus) => {
  const category = await findCategoryOrThrow(id);

  return Category.findByIdAndUpdate(
    category._id,
    { status },
    { new: true, runValidators: true },
  );
};

/**
 * Soft delete, cascading down the branch: a live child under a deleted parent is
 * unreachable in the tree and would still show in flat listings.
 */
const deleteCategory = async (id: string) => {
  const category = await findCategoryOrThrow(id);
  const ids = await collectCategoryAndDescendantIds([category._id]);

  await Category.updateMany({ _id: { $in: ids } }, { isDeleted: true });

  await queueCascadeCategory({
    categoryIds: ids.map((entry) => entry.toString()),
  });

  return { deleted: ids.length };
};

const bulkUpdateCategories = async (
  ids: string[],
  payload: TUpdateCategory,
): Promise<TBulkResult> => {
  const update: Record<string, unknown> = {};

  if (payload.parentId !== undefined) {
    const parent = await resolveParent(payload.parentId);
    update.parentId = parent!.parentId;
    update.parentName = parent!.parentName;
  }
  if (payload.description !== undefined)
    update.description = payload.description;
  if (payload.status !== undefined) update.status = payload.status;
  if (payload.icon !== undefined) update.icon = payload.icon;

  if (!Object.keys(update).length) {
    throw new AppError(httpStatus.BAD_REQUEST, "Nothing to update");
  }

  // Name and slug are excluded on purpose: slugs are unique, so one shared value
  // across a batch cannot be written.
  const result = await Category.updateMany(
    { _id: { $in: ids }, ...NOT_DELETED },
    update,
  );

  const missing = ids.length - result.matchedCount;

  return {
    succeeded: result.matchedCount,
    failed: missing
      ? [
          {
            index: -1,
            error: `${missing} of the selected categories no longer exist`,
          },
        ]
      : [],
  };
};

const bulkDeleteCategories = async (ids: string[]): Promise<TBulkResult> => {
  const existing = await Category.find({
    _id: { $in: ids },
    ...NOT_DELETED,
  }).select("_id");

  const branch = await collectCategoryAndDescendantIds(
    existing.map((category) => category._id),
  );

  await Category.updateMany({ _id: { $in: branch } }, { isDeleted: true });

  await queueCascadeCategory({
    categoryIds: branch.map((entry) => entry.toString()),
  });

  const missing = ids.length - existing.length;

  return {
    succeeded: branch.length,
    failed: missing
      ? [
          {
            index: -1,
            error: `${missing} of the selected categories no longer exist`,
          },
        ]
      : [],
  };
};

export const categoryServices = {
  createCategory,
  bulkCreateCategories,
  getCategories,
  getCategoryTree,
  getShowingCategoryTree,
  getCategoryById,
  updateCategory,
  updateCategoryStatus,
  deleteCategory,
  bulkUpdateCategories,
  bulkDeleteCategories,
};
