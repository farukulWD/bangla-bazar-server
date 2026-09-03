import httpStatus from "http-status";
import { Types } from "mongoose";
import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { queueImageUpload } from "../../queues/products.queue";
import { Attribute } from "../attribute/attribute.model";
import { Category } from "../category/category.model";
import {
  PRODUCT_DISCOUNTED_LIMIT,
  PRODUCT_POPULAR_LIMIT,
  PRODUCT_QUERY_CONTROL_KEYS,
  PRODUCT_RELATED_LIMIT,
  PRODUCT_SEARCHABLE_FIELDS,
} from "./product.constant";
import {
  TBulkResult,
  TCreateProduct,
  TCreateVariant,
  TProductDocument,
  TProductResponse,
  TProductStatus,
  TStoreProducts,
  TUpdateProduct,
} from "./product.interface";
import { Product } from "./product.model";
import {
  deriveDiscount,
  generateUniqueSlug,
  liveVariants,
  toProductResponse,
  variantKey,
} from "./product.utils";
import { productRowSchema } from "./product.validation";

const NOT_DELETED = { isDeleted: { $ne: true } };
const SHOWING = { ...NOT_DELETED, status: "show" as TProductStatus };

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const findProductOrThrow = async (id: string): Promise<TProductDocument> => {
  const product = await Product.findOne({ _id: id, ...NOT_DELETED });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  return product;
};

const resolveCategories = async (
  primary: string,
  extra?: string[],
): Promise<{ category: Types.ObjectId; categories: Types.ObjectId[] }> => {
  const wanted = [...new Set([primary, ...(extra ?? [])])];

  const found = await Category.find({
    _id: { $in: wanted },
    ...NOT_DELETED,
  }).select("_id");

  const live = new Set(found.map((category) => category._id.toString()));
  const missing = wanted.filter((id) => !live.has(id));

  if (missing.length) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `No live category with id ${missing.join(", ")}`,
    );
  }

  return {
    category: new Types.ObjectId(primary),
    categories: wanted.map((id) => new Types.ObjectId(id)),
  };
};

const assertVariantOptions = async (variants: TCreateVariant[]) => {
  const attributeIds = [
    ...new Set(
      variants.flatMap((variant) =>
        variant.options.map((option) => option.attributeId),
      ),
    ),
  ];

  if (!attributeIds.length) {
    return;
  }

  const attributes = await Attribute.find({
    _id: { $in: attributeIds },
    ...NOT_DELETED,
  });

  const pairs = new Set<string>();
  attributes.forEach((attribute) => {
    attribute.values
      .filter((value) => value.isDeleted !== true)
      .forEach((value) =>
        pairs.add(`${attribute._id.toString()}:${value._id.toString()}`),
      );
  });

  variants.forEach((variant, index) => {
    variant.options.forEach((option) => {
      if (!pairs.has(`${option.attributeId}:${option.valueId}`)) {
        throw new AppError(
          httpStatus.BAD_REQUEST,
          `Variant ${index + 1} names an attribute value that does not exist`,
        );
      }
    });
  });
};

const assertNoDuplicateVariants = (variants: TCreateVariant[]) => {
  const seen = new Set<string>();

  variants.forEach((variant, index) => {
    const key = variant.options
      .map((option) => `${option.attributeId}:${option.valueId}`)
      .sort()
      .join("|");

    if (seen.has(key)) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `Variant ${index + 1} repeats a combination already listed`,
      );
    }

    seen.add(key);
  });
};

const buildVariant = (row: TCreateVariant) => ({
  options: row.options.map((option) => ({
    attributeId: new Types.ObjectId(option.attributeId),
    valueId: new Types.ObjectId(option.valueId),
  })),
  sku: row.sku,
  barcode: row.barcode,
  originalPrice: row.originalPrice,
  price: row.price,
  discount: deriveDiscount(row.originalPrice, row.price),
  stock: row.stock ?? 0,
  image: row.image,
  isDeleted: false,
});

const applyVariantDerived = (product: TProductDocument) => {
  const live = liveVariants(product.variants);
  product.isCombination = live.length > 0;

  if (product.isCombination) {
    product.stock = live.reduce(
      (sum, variant) => sum + (variant.stock ?? 0),
      0,
    );
  }
};

const queueImagesFor = async (
  product: TProductDocument,
  files?: Express.Multer.File[],
) => {
  if (!files?.length) {
    return;
  }

  await queueImageUpload({
    productId: product._id.toString(),
    files: files.map((file) => ({ path: file.path, mimetype: file.mimetype })),
  });
};

const createProduct = async (
  payload: TCreateProduct,
  files?: Express.Multer.File[],
): Promise<TProductResponse> => {
  const variantRows = payload.variants ?? [];

  if (variantRows.length) {
    assertNoDuplicateVariants(variantRows);
    await assertVariantOptions(variantRows);
  }

  const { category, categories } = await resolveCategories(
    payload.category,
    payload.categories,
  );

  const slug = await generateUniqueSlug(payload.slug || payload.title);
  const variants = variantRows.map(buildVariant);
  const isCombination = variants.length > 0;

  const product = await Product.create({
    title: payload.title,
    description: payload.description,
    slug,
    sku: payload.sku,
    barcode: payload.barcode,
    category,
    categories,
    images: payload.images ?? [],
    imageStatus: files?.length ? "processing" : "ready",
    tags: payload.tags ?? [],
    prices: {
      originalPrice: payload.prices.originalPrice,
      price: payload.prices.price,
      discount: deriveDiscount(
        payload.prices.originalPrice,
        payload.prices.price,
      ),
    },
    stock: isCombination
      ? variants.reduce((sum, variant) => sum + variant.stock, 0)
      : (payload.stock ?? 0),
    isCombination,
    variants,
    status: payload.status,
  });

  await queueImagesFor(product, files);

  return toProductResponse(product);
};

const buildListFilter = (query: Record<string, unknown>) => {
  const filter: Record<string, unknown> = { ...NOT_DELETED };

  if (query.category && Types.ObjectId.isValid(String(query.category))) {
    filter.categories = new Types.ObjectId(String(query.category));
  }

  const min = Number(query.minPrice);
  const max = Number(query.maxPrice);
  const bounds: { $gte?: number; $lte?: number } = {};
  if (query.minPrice !== undefined && !Number.isNaN(min)) bounds.$gte = min;
  if (query.maxPrice !== undefined && !Number.isNaN(max)) bounds.$lte = max;
  if (Object.keys(bounds).length) {
    filter["prices.price"] = bounds;
  }

  if (query.inStock === "true") {
    filter.stock = { $gt: 0 };
  }

  if (query.discounted === "true") {
    filter["prices.discount"] = { $gt: 0 };
  }

  return filter;
};

const getProducts = async (
  query: Record<string, unknown>,
): Promise<{ data: TProductResponse[]; pagination: TPagination }> => {
  const productQuery = new QueryBuilder(
    Product.find(buildListFilter(query)),
    query,
  )
    .search(PRODUCT_SEARCHABLE_FIELDS)
    .filter(PRODUCT_QUERY_CONTROL_KEYS)
    .sort();

  await productQuery.paginate();
  productQuery.fields();

  const products = await productQuery.modelQuery.populate(
    "category",
    "_id name slug",
  );

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data: products.map((product) => toProductResponse(product)),
    pagination: {
      page,
      limit,
      total: productQuery.total,
      totalPage: Math.ceil(productQuery.total / limit),
    },
  };
};

const getShowingProducts = async (): Promise<TProductResponse[]> => {
  const products = await Product.find(SHOWING).sort({ createdAt: -1 });
  return products.map((product) => toProductResponse(product));
};

const discountedFilter = {
  ...SHOWING,
  $or: [
    { "prices.discount": { $gt: 0 } },
    {
      variants: {
        $elemMatch: { discount: { $gt: 0 }, isDeleted: { $ne: true } },
      },
    },
  ],
};

const getDiscountedProducts = async (): Promise<TProductResponse[]> => {
  const products = await Product.find(discountedFilter)
    .sort({ "prices.discount": -1 })
    .limit(PRODUCT_DISCOUNTED_LIMIT);

  return products.map((product) => toProductResponse(product));
};

const getStoreProducts = async (query: {
  category?: string;
  title?: string;
  slug?: string;
}): Promise<TStoreProducts> => {
  const empty: TStoreProducts = {
    products: [],
    popularProducts: [],
    relatedProducts: [],
    discountedProducts: [],
  };

  if (query.slug) {
    const product = await Product.findOne({ slug: query.slug, ...SHOWING });

    if (!product) {
      return empty;
    }

    const related = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      ...SHOWING,
    }).limit(PRODUCT_RELATED_LIMIT);

    return {
      ...empty,
      products: [toProductResponse(product)],
      relatedProducts: related.map((item) => toProductResponse(item)),
    };
  }

  if (query.category || query.title) {
    const filter: Record<string, unknown> = { ...SHOWING };

    if (query.category && Types.ObjectId.isValid(query.category)) {
      filter.categories = new Types.ObjectId(query.category);
    }

    if (query.title) {
      filter.title = { $regex: escapeRegex(query.title), $options: "i" };
    }

    const products = await Product.find(filter).sort({ createdAt: -1 });

    return { ...empty, products: products.map((p) => toProductResponse(p)) };
  }

  const [products, popular, discounted] = await Promise.all([
    Product.find(SHOWING).sort({ createdAt: -1 }),
    Product.find(SHOWING).sort({ sales: -1 }).limit(PRODUCT_POPULAR_LIMIT),
    Product.find(discountedFilter)
      .sort({ "prices.discount": -1 })
      .limit(PRODUCT_DISCOUNTED_LIMIT),
  ]);

  return {
    products: products.map((product) => toProductResponse(product)),
    popularProducts: popular.map((product) => toProductResponse(product)),
    relatedProducts: [],
    discountedProducts: discounted.map((product) => toProductResponse(product)),
  };
};

const getProductById = async (id: string): Promise<TProductResponse> => {
  const product = await findProductOrThrow(id);
  await product.populate("category", "_id name slug");
  return toProductResponse(product);
};

const getProductBySlug = async (slug: string): Promise<TProductResponse> => {
  const product = await Product.findOne({ slug, ...NOT_DELETED });

  if (!product) {
    throw new AppError(httpStatus.NOT_FOUND, "Product not found");
  }

  await product.populate("category", "_id name slug");

  return toProductResponse(product);
};

const reconcileVariants = async (
  product: TProductDocument,
  rows: TCreateVariant[],
) => {
  assertNoDuplicateVariants(rows);
  await assertVariantOptions(rows);

  const kept = new Set(rows.map((row) => row._id).filter(Boolean));

  product.variants.forEach((variant) => {
    if (!kept.has(variant._id.toString())) {
      variant.isDeleted = true;
    }
  });

  rows.forEach((row) => {
    const fields = buildVariant(row);

    if (!row._id) {
      product.variants.push({ ...fields, _id: new Types.ObjectId() });
      return;
    }

    const target = product.variants.find(
      (variant) => variant._id.toString() === row._id,
    );

    if (!target) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        `This product has no variant ${row._id}`,
      );
    }

    Object.assign(target, fields);
  });
};

const updateProduct = async (
  id: string,
  payload: TUpdateProduct,
  files?: Express.Multer.File[],
): Promise<TProductResponse> => {
  const product = await findProductOrThrow(id);

  if (payload.title !== undefined) {
    product.title = payload.title;
    // The slug tracks the title unless the caller sets one explicitly.
    if (payload.slug === undefined) {
      product.slug = await generateUniqueSlug(payload.title, product._id);
    }
  }

  if (payload.slug !== undefined) {
    product.slug = await generateUniqueSlug(payload.slug, product._id);
  }

  if (payload.description !== undefined)
    product.description = payload.description;
  if (payload.sku !== undefined) product.sku = payload.sku;
  if (payload.barcode !== undefined) product.barcode = payload.barcode;
  if (payload.tags !== undefined) product.tags = payload.tags;
  if (payload.images !== undefined) product.images = payload.images;
  if (payload.status !== undefined) product.status = payload.status;

  if (payload.category !== undefined || payload.categories !== undefined) {
    const { category, categories } = await resolveCategories(
      payload.category ?? product.category.toString(),
      payload.categories ?? product.categories.map((entry) => entry.toString()),
    );
    product.category = category;
    product.categories = categories;
  }

  if (payload.prices !== undefined) {
    product.prices = {
      originalPrice: payload.prices.originalPrice,
      price: payload.prices.price,
      discount: deriveDiscount(
        payload.prices.originalPrice,
        payload.prices.price,
      ),
    };
  }

  if (payload.stock !== undefined) {
    product.stock = payload.stock;
  }

  if (payload.variants !== undefined) {
    await reconcileVariants(product, payload.variants);
  }

  applyVariantDerived(product);

  if (files?.length) {
    product.imageStatus = "processing";
  }

  await product.save();
  await queueImagesFor(product, files);

  return toProductResponse(product);
};

const updateProductStatus = async (
  id: string,
  status: TProductStatus,
): Promise<TProductResponse> => {
  const product = await findProductOrThrow(id);
  product.status = status;
  await product.save();

  return toProductResponse(product);
};

const deleteProduct = async (id: string): Promise<{ deleted: number }> => {
  const product = await findProductOrThrow(id);
  product.isDeleted = true;
  await product.save();

  return { deleted: 1 };
};

const bulkCreateProducts = async (payload: unknown[]): Promise<TBulkResult> => {
  const failed: TBulkResult["failed"] = [];
  const claimedSlugs = new Set<string>();
  let succeeded = 0;

  for (const [index, entry] of payload.entries()) {
    const parsed = productRowSchema.safeParse(entry);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failed.push({
        index,
        identifier:
          entry && typeof entry === "object" && "title" in entry
            ? String((entry as { title: unknown }).title)
            : undefined,
        error: issue
          ? `${issue.path.join(".") || "row"}: ${issue.message}`
          : "Invalid product",
      });
      continue;
    }

    const row = parsed.data;

    try {
      const variantRows = row.variants ?? [];

      if (variantRows.length) {
        assertNoDuplicateVariants(variantRows);
        await assertVariantOptions(variantRows);
      }

      const { category, categories } = await resolveCategories(
        row.category,
        row.categories,
      );

      const slug = await generateUniqueSlug(
        row.slug || row.title,
        undefined,
        claimedSlugs,
      );

      const variants = variantRows.map(buildVariant);
      const isCombination = variants.length > 0;

      await Product.create({
        title: row.title,
        description: row.description,
        slug,
        sku: row.sku,
        barcode: row.barcode,
        category,
        categories,
        images: row.images ?? [],
        tags: row.tags ?? [],
        prices: {
          originalPrice: row.prices.originalPrice,
          price: row.prices.price,
          discount: deriveDiscount(row.prices.originalPrice, row.prices.price),
        },
        stock: isCombination
          ? variants.reduce((sum, variant) => sum + variant.stock, 0)
          : (row.stock ?? 0),
        isCombination,
        variants,
        status: row.status,
      });

      claimedSlugs.add(slug);
      succeeded += 1;
    } catch (error) {
      failed.push({
        index,
        identifier: row.title,
        error: error instanceof Error ? error.message : "Could not be created",
      });
    }
  }

  return { succeeded, failed };
};

const bulkUpdateProducts = async (
  ids: string[],
  patch: { status?: TProductStatus; category?: string },
): Promise<{ updated: number }> => {
  const update: Record<string, unknown> = {};

  if (patch.status !== undefined) {
    update.$set = { status: patch.status };
  }

  if (patch.category !== undefined) {
    const { category } = await resolveCategories(patch.category);
    update.$set = { ...(update.$set as object), category };
    update.$addToSet = { categories: category };
  }

  if (!Object.keys(update).length) {
    return { updated: 0 };
  }

  const result = await Product.updateMany(
    { _id: { $in: ids }, ...NOT_DELETED },
    update,
  );

  return { updated: result.modifiedCount };
};

const bulkDeleteProducts = async (
  ids: string[],
): Promise<{ deleted: number }> => {
  const result = await Product.updateMany(
    { _id: { $in: ids }, ...NOT_DELETED },
    { isDeleted: true },
  );

  return { deleted: result.modifiedCount };
};

const exportProducts = async (filter: {
  status?: string;
  category?: string;
}) => {
  const query: Record<string, unknown> = { ...NOT_DELETED };

  if (filter.status) query.status = filter.status;
  if (filter.category && Types.ObjectId.isValid(filter.category)) {
    query.categories = new Types.ObjectId(filter.category);
  }

  return Product.find(query).lean();
};

const stripAttributeValue = async (
  attributeId: string,
  valueId?: string,
): Promise<{ updated: number }> => {
  const optionMatch: Record<string, unknown> = { attributeId };
  if (valueId) optionMatch.valueId = valueId;

  const products = await Product.find({
    variants: { $elemMatch: { options: { $elemMatch: optionMatch } } },
  });

  for (const product of products) {
    product.variants.forEach((variant) => {
      variant.options = variant.options.filter(
        (option) =>
          !(
            option.attributeId.toString() === attributeId &&
            (!valueId || option.valueId.toString() === valueId)
          ),
      );

      if (!variant.options.length) {
        variant.isDeleted = true;
      }
    });

    applyVariantDerived(product);
    await product.save();
  }

  return { updated: products.length };
};

const stripCategory = async (
  categoryIds: string[],
): Promise<{ unlinked: number; hidden: number }> => {
  const ids = categoryIds.map((id) => new Types.ObjectId(id));

  const unlinked = await Product.updateMany(
    { categories: { $in: ids } },
    { $pull: { categories: { $in: ids } } },
  );

  const hidden = await Product.updateMany(
    { category: { $in: ids }, ...NOT_DELETED },
    { $set: { status: "hide" } },
  );

  return {
    unlinked: unlinked.modifiedCount,
    hidden: hidden.modifiedCount,
  };
};

export const productServices = {
  createProduct,
  getProducts,
  getShowingProducts,
  getStoreProducts,
  getDiscountedProducts,
  getProductById,
  getProductBySlug,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  bulkCreateProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  exportProducts,
  stripAttributeValue,
  stripCategory,
};
