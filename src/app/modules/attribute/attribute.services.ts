import httpStatus from "http-status";
import { Types } from "mongoose";
import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { queueCascadeAttributeValue } from "../../queues/products.queue";
import {
  ATTRIBUTE_QUERY_CONTROL_KEYS,
  ATTRIBUTE_SEARCHABLE_FIELDS,
} from "./attribute.constant";
import {
  TAttributeDocument,
  TAttributeResponse,
  TAttributeStatus,
  TAttributeValue,
  TBulkResult,
  TCreateAttribute,
  TCreateAttributeValue,
  TUpdateAttribute,
} from "./attribute.interface";
import { Attribute } from "./attribute.model";
import { generateUniqueSlug, toAttributeResponse } from "./attribute.utils";
import { attributeRowSchema } from "./attribute.validation";

const NOT_DELETED = { isDeleted: { $ne: true } };

const findAttributeOrThrow = async (
  id: string,
): Promise<TAttributeDocument> => {
  const attribute = await Attribute.findOne({ _id: id, ...NOT_DELETED });

  if (!attribute) {
    throw new AppError(httpStatus.NOT_FOUND, "Attribute not found");
  }

  return attribute;
};

/** Compared by string rather than the legacy `==` between an ObjectId and a param. */
const findValueOrThrow = (
  attribute: TAttributeDocument,
  valueId: string,
): TAttributeValue => {
  const value = attribute.values.find(
    (entry) => entry._id.toString() === valueId && entry.isDeleted !== true,
  );

  if (!value) {
    throw new AppError(httpStatus.NOT_FOUND, "Attribute value not found");
  }

  return value;
};

/**
 * Two live values under one attribute cannot share a name: the storefront renders
 * them as a single list of choices, so a duplicate is unpickable.
 */
const assertValueNameIsFree = (
  attribute: TAttributeDocument,
  name: string,
  excludeValueId?: string,
) => {
  const wanted = name.trim().toLowerCase();
  const clash = attribute.values.some(
    (entry) =>
      entry.isDeleted !== true &&
      entry._id.toString() !== excludeValueId &&
      entry.name.trim().toLowerCase() === wanted,
  );

  if (clash) {
    throw new AppError(
      httpStatus.CONFLICT,
      `"${name}" is already a value of this attribute`,
    );
  }
};

/**
 * Ids are minted here rather than left to Mongoose so the type stays honest — the id
 * is the join key products are built on, not an incidental field.
 */
const buildValues = (
  values: TCreateAttributeValue[] = [],
): TAttributeValue[] => {
  const claimed = new Set<string>();

  return values.map((value) => {
    const key = value.name.trim().toLowerCase();

    if (claimed.has(key)) {
      throw new AppError(
        httpStatus.CONFLICT,
        `"${value.name}" is listed twice in the same attribute`,
      );
    }

    claimed.add(key);

    return {
      _id: new Types.ObjectId(),
      name: value.name,
      status: value.status ?? "show",
      isDeleted: false,
    };
  });
};

const createAttribute = async (
  payload: TCreateAttribute,
): Promise<TAttributeResponse> => {
  const attribute = await Attribute.create({
    name: payload.name,
    slug: await generateUniqueSlug(payload.slug || payload.name),
    option: payload.option,
    type: payload.type,
    status: payload.status,
    values: buildValues(payload.values),
  });

  return toAttributeResponse(attribute);
};

/**
 * Row by row rather than `insertMany`: each slug is derived from the name and must be
 * unique, and a collision inside the batch is invisible to a pre-generated list. A
 * failed row is recorded and the rest still land — the legacy `addAllAttributes` ran
 * `deleteMany()` over the whole collection first, which this deliberately does not do.
 */
const bulkCreateAttributes = async (
  payload: unknown[],
): Promise<TBulkResult> => {
  const failed: TBulkResult["failed"] = [];
  const claimedSlugs = new Set<string>();
  let succeeded = 0;

  for (const [index, entry] of payload.entries()) {
    const parsed = attributeRowSchema.safeParse(entry);

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
          : "Invalid attribute",
      });
      continue;
    }

    const row = parsed.data;

    try {
      const slug = await generateUniqueSlug(
        row.slug || row.name,
        undefined,
        claimedSlugs,
      );

      await Attribute.create({
        name: row.name,
        slug,
        option: row.option,
        type: row.type,
        status: row.status,
        values: buildValues(row.values),
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

const getAttributes = async (
  query: Record<string, unknown>,
): Promise<{ data: TAttributeResponse[]; pagination: TPagination }> => {
  const attributeQuery = new QueryBuilder(Attribute.find(NOT_DELETED), query)
    .search(ATTRIBUTE_SEARCHABLE_FIELDS)
    .filter(ATTRIBUTE_QUERY_CONTROL_KEYS)
    .sort();

  await attributeQuery.paginate();
  attributeQuery.fields();

  const attributes = await attributeQuery.modelQuery;

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data: attributes.map((attribute) => toAttributeResponse(attribute)),
    pagination: {
      page,
      limit,
      total: attributeQuery.total,
      totalPage: Math.ceil(attributeQuery.total / limit),
    },
  };
};

/** The public list: published attributes, each carrying only its published values. */
const getShowingAttributes = async (): Promise<TAttributeResponse[]> => {
  const attributes = await Attribute.find({
    ...NOT_DELETED,
    status: "show",
  }).sort({ createdAt: -1 });

  return attributes.map((attribute) =>
    toAttributeResponse(attribute, { onlyShowingValues: true }),
  );
};

const getAttributeById = async (id: string): Promise<TAttributeResponse> =>
  toAttributeResponse(await findAttributeOrThrow(id));

const updateAttribute = async (
  id: string,
  payload: TUpdateAttribute,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);

  if (payload.name !== undefined) {
    attribute.name = payload.name;
    // The slug tracks the name unless the caller sets one explicitly.
    if (payload.slug === undefined) {
      attribute.slug = await generateUniqueSlug(payload.name, attribute._id);
    }
  }

  if (payload.slug !== undefined) {
    attribute.slug = await generateUniqueSlug(payload.slug, attribute._id);
  }

  if (payload.option !== undefined) attribute.option = payload.option;
  if (payload.type !== undefined) attribute.type = payload.type;
  if (payload.status !== undefined) attribute.status = payload.status;

  await attribute.save();

  return toAttributeResponse(attribute);
};

const updateAttributeStatus = async (
  id: string,
  status: TAttributeStatus,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);

  attribute.status = status;
  await attribute.save();

  return toAttributeResponse(attribute);
};

const deleteAttribute = async (id: string): Promise<{ deleted: number }> => {
  const attribute = await findAttributeOrThrow(id);
  attribute.isDeleted = true;
  await attribute.save();
  await queueCascadeAttributeValue({ attributeId: id });

  return { deleted: 1 };
};

const addAttributeValue = async (
  id: string,
  payload: TCreateAttributeValue,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);

  assertValueNameIsFree(attribute, payload.name);

  attribute.values.push({
    _id: new Types.ObjectId(),
    name: payload.name,
    status: payload.status ?? "show",
    isDeleted: false,
  });

  await attribute.save();

  return toAttributeResponse(attribute);
};

const updateAttributeValue = async (
  id: string,
  valueId: string,
  payload: Partial<TCreateAttributeValue>,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);
  const value = findValueOrThrow(attribute, valueId);

  if (payload.name !== undefined) {
    assertValueNameIsFree(attribute, payload.name, valueId);
    value.name = payload.name;
  }

  if (payload.status !== undefined) {
    value.status = payload.status;
  }

  await attribute.save();

  return toAttributeResponse(attribute);
};

const updateAttributeValueStatus = async (
  id: string,
  valueId: string,
  status: TAttributeStatus,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);
  const value = findValueOrThrow(attribute, valueId);

  value.status = status;
  await attribute.save();

  return toAttributeResponse(attribute);
};

const deleteAttributeValue = async (
  id: string,
  valueId: string,
): Promise<TAttributeResponse> => {
  const attribute = await findAttributeOrThrow(id);
  const value = findValueOrThrow(attribute, valueId);

  value.isDeleted = true;
  await attribute.save();

  await queueCascadeAttributeValue({ attributeId: id, valueId });

  return toAttributeResponse(attribute);
};

const bulkUpdateAttributes = async (
  ids: string[],
  payload: TUpdateAttribute,
): Promise<TBulkResult> => {
  const update: Record<string, unknown> = {};

  if (payload.status !== undefined) update.status = payload.status;
  if (payload.option !== undefined) update.option = payload.option;
  if (payload.type !== undefined) update.type = payload.type;

  if (!Object.keys(update).length) {
    throw new AppError(httpStatus.BAD_REQUEST, "Nothing to update");
  }

  const result = await Attribute.updateMany(
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
            error: `${missing} of the selected attributes no longer exist`,
          },
        ]
      : [],
  };
};

const bulkDeleteAttributes = async (ids: string[]): Promise<TBulkResult> => {
  const result = await Attribute.updateMany(
    { _id: { $in: ids }, ...NOT_DELETED },
    { isDeleted: true },
  );

  const missing = ids.length - result.matchedCount;

  await Promise.all(
    ids.map((attributeId) => queueCascadeAttributeValue({ attributeId })),
  );

  return {
    succeeded: result.matchedCount,
    failed: missing
      ? [
          {
            index: -1,
            error: `${missing} of the selected attributes no longer exist`,
          },
        ]
      : [],
  };
};

const bulkDeleteAttributeValues = async (
  id: string,
  valueIds: string[],
): Promise<TBulkResult> => {
  const attribute = await findAttributeOrThrow(id);
  const wanted = new Set(valueIds);
  let succeeded = 0;

  attribute.values.forEach((value) => {
    if (wanted.has(value._id.toString()) && value.isDeleted !== true) {
      value.isDeleted = true;
      succeeded += 1;
    }
  });

  await attribute.save();

  await Promise.all(
    valueIds.map((valueId) =>
      queueCascadeAttributeValue({ attributeId: id, valueId }),
    ),
  );

  const missing = valueIds.length - succeeded;

  return {
    succeeded,
    failed: missing
      ? [
          {
            index: -1,
            error: `${missing} of the selected values no longer exist`,
          },
        ]
      : [],
  };
};

export const attributeServices = {
  createAttribute,
  bulkCreateAttributes,
  getAttributes,
  getShowingAttributes,
  getAttributeById,
  updateAttribute,
  updateAttributeStatus,
  deleteAttribute,
  addAttributeValue,
  updateAttributeValue,
  updateAttributeValueStatus,
  deleteAttributeValue,
  bulkUpdateAttributes,
  bulkDeleteAttributes,
  bulkDeleteAttributeValues,
};
