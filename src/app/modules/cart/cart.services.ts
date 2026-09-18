import httpStatus from "http-status";
import { ClientSession, Types, UpdateQuery } from "mongoose";

import AppError from "../../errors/AppError";
import {
  TProductResponse,
  TProductVariant,
} from "../product/product.interface";
import { Product } from "../product/product.model";
import { liveVariants } from "../product/product.utils";
import { CART_MAX_LINES, CART_MAX_QTY } from "./cart.constant";
import {
  TCart,
  TCartItem,
  TCartLineOption,
  TCartLineView,
  TCartView,
  TSetCartItem,
} from "./cart.interface";
import { Cart } from "./cart.model";
import {
  imageOf,
  lineKey,
  loadOptionLabels,
  optionsOf,
  toObjectId,
} from "./cart.utils";

const LIVE_PRODUCT = { isDeleted: { $ne: true } };

const productNotFound = () =>
  new AppError(httpStatus.NOT_FOUND, "Product not found");

const badRequest = (message: string, path: string) =>
  new AppError(httpStatus.BAD_REQUEST, message, "", [{ path, message }]);

const isDuplicateKeyError = (error: unknown): boolean =>
  typeof error === "object" &&
  error !== null &&
  (error as { code?: number }).code === 11000;

const emptyView = (updatedAt: Date | null = null): TCartView => ({
  items: [],
  subtotal: 0,
  updatedAt,
});

const resolveLine = (
  item: TCartItem,
  product: TProductResponse,
  labels: Map<string, TCartLineOption>,
): TCartLineView | null => {
  let variant: TProductVariant | null = null;

  if (product.isCombination) {
    if (!item.variant) {
      return null;
    }

    variant =
      liveVariants(product.variants ?? []).find(
        (candidate) => candidate._id.toString() === item.variant?.toString(),
      ) ?? null;

    if (!variant) {
      return null;
    }
  } else if (item.variant) {
    return null;
  }

  const price = variant ? variant.price : product.prices.price;
  const stock = variant ? variant.stock : product.stock;

  const qty = Math.min(item.qty, CART_MAX_QTY);

  const unavailableReason =
    product.status !== "show"
      ? "This item is no longer on sale"
      : stock <= 0
        ? "This item is out of stock"
        : null;

  return {
    lineId: item._id.toString(),
    productId: product._id.toString(),
    variantId: variant ? variant._id.toString() : null,
    title: product.title,
    slug: product.slug,
    image: imageOf(product, variant),
    sku: variant?.sku || product.sku || "",
    options: optionsOf(variant, labels),
    price,
    originalPrice: variant
      ? variant.originalPrice
      : product.prices.originalPrice,
    discount: variant ? variant.discount : product.prices.discount,
    qty,
    lineTotal: price * qty,
    stock,
    isAvailable: unavailableReason === null,
    unavailableReason,
  };
};

export const priceCart = async (
  cart: TCart | null,
  session?: ClientSession,
): Promise<TCartView> => {
  if (!cart || cart.items.length === 0) {
    return emptyView(cart?.updatedAt ?? null);
  }

  const products = await Product.find({
    _id: { $in: cart.items.map((item) => item.product) },
    ...LIVE_PRODUCT,
  })
    .session(session ?? null)
    .lean<TProductResponse[]>();

  const byId = new Map(
    products.map((product) => [product._id.toString(), product]),
  );
  const labels = await loadOptionLabels(products);

  const items: TCartLineView[] = [];
  const unresolvable: Types.ObjectId[] = [];

  for (const item of cart.items) {
    const product = byId.get(item.product.toString());
    const line = product ? resolveLine(item, product, labels) : null;

    if (!line) {
      unresolvable.push(item._id);
      continue;
    }

    items.push(line);
  }

  if (unresolvable.length > 0) {
    await Cart.updateOne(
      { _id: cart._id },
      { $pull: { items: { _id: { $in: unresolvable } } } },
      session ? { session } : {},
    );
  }

  return {
    items,
    subtotal: items.reduce(
      (sum, line) => (line.isAvailable ? sum + line.lineTotal : sum),
      0,
    ),
    updatedAt: cart.updatedAt,
  };
};

const upsertCart = async (
  user: Types.ObjectId,
  update: UpdateQuery<TCart>,
): Promise<TCart | null> => {
  try {
    return await Cart.findOneAndUpdate({ user }, update, {
      new: true,
      upsert: true,
      runValidators: true,
    }).lean<TCart | null>();
  } catch (error) {
    if (!isDuplicateKeyError(error)) {
      throw error;
    }

    return Cart.findOneAndUpdate({ user }, update, {
      new: true,
      runValidators: true,
    }).lean<TCart | null>();
  }
};

const getCart = async (user: Types.ObjectId): Promise<TCartView> =>
  priceCart(await Cart.findOne({ user }).lean<TCart | null>());

const setLineQty = async (
  user: Types.ObjectId,
  product: Types.ObjectId,
  variant: Types.ObjectId | null,
  qty: number,
): Promise<TCart | null> => {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const updated = await Cart.findOneAndUpdate(
      { user, items: { $elemMatch: { product, variant } } },
      { $set: { "items.$.qty": qty } },
      { new: true, runValidators: true },
    ).lean<TCart | null>();

    if (updated) {
      return updated;
    }

    const existing = await Cart.findOne({ user })
      .select("items._id")
      .lean<TCart | null>();

    if (existing && existing.items.length >= CART_MAX_LINES) {
      throw badRequest(
        `A cart holds at most ${CART_MAX_LINES} items`,
        "productId",
      );
    }

    try {
      const pushed = await Cart.findOneAndUpdate(
        { user, items: { $not: { $elemMatch: { product, variant } } } },
        { $push: { items: { product, variant, qty } } },
        { new: true, upsert: true, runValidators: true },
      ).lean<TCart | null>();

      if (pushed) {
        return pushed;
      }
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
    }
  }

  throw new AppError(
    httpStatus.CONFLICT,
    "Your cart is being changed from somewhere else. Please try again.",
  );
};

const pullLine = async (
  user: Types.ObjectId,
  match: Record<string, unknown>,
): Promise<TCartView> =>
  priceCart(
    await Cart.findOneAndUpdate(
      { user },
      { $pull: { items: match } },
      { new: true },
    ).lean<TCart | null>(),
  );

const setItem = async (
  user: Types.ObjectId,
  payload: TSetCartItem,
): Promise<TCartView> => {
  const productId = toObjectId(payload.productId);

  if (!productId) {
    throw productNotFound();
  }

  const variantId = toObjectId(payload.variantId ?? null);

  const product = await Product.findOne({
    _id: productId,
    ...LIVE_PRODUCT,
  }).lean<TProductResponse | null>();

  if (!product) {
    throw productNotFound();
  }

  if (payload.qty <= 0) {
    return pullLine(user, { product: productId, variant: variantId });
  }

  if (product.status !== "show") {
    throw badRequest("This item is no longer on sale", "productId");
  }

  if (product.isCombination) {
    if (!variantId) {
      throw badRequest(
        "Choose an option before adding this to your cart",
        "variantId",
      );
    }

    const exists = liveVariants(product.variants ?? []).some(
      (variant) => variant._id.toString() === variantId.toString(),
    );

    if (!exists) {
      throw badRequest("That option is no longer available", "variantId");
    }
  } else if (variantId) {
    throw badRequest("This item has no options to choose", "variantId");
  }

  return priceCart(await setLineQty(user, productId, variantId, payload.qty));
};

const removeItem = async (
  user: Types.ObjectId,
  lineId: string,
): Promise<TCartView> => {
  const id = toObjectId(lineId);

  if (!id) {
    return getCart(user);
  }

  return pullLine(user, { _id: id });
};

const clearCart = async (user: Types.ObjectId): Promise<TCartView> =>
  priceCart(
    await Cart.findOneAndUpdate(
      { user },
      { $set: { items: [] } },
      { new: true },
    ).lean<TCart | null>(),
  );

export const emptyCart = async (
  user: Types.ObjectId,
  session: ClientSession,
): Promise<void> => {
  await Cart.updateOne({ user }, { $set: { items: [] } }, { session });
};

type TMergeLine = {
  product: Types.ObjectId;
  variant: Types.ObjectId | null;
  qty: number;
  wasStored: boolean;
};

const mergeCart = async (
  user: Types.ObjectId,
  lines: TSetCartItem[],
): Promise<TCartView> => {
  const cart = await Cart.findOne({ user }).lean<TCart | null>();

  const merged = new Map<string, TMergeLine>();

  for (const item of cart?.items ?? []) {
    merged.set(lineKey(item.product, item.variant), {
      product: item.product,
      variant: item.variant,
      qty: item.qty,
      wasStored: true,
    });
  }

  for (const line of lines) {
    const product = toObjectId(line.productId);

    if (!product || line.qty <= 0) {
      continue;
    }

    const variant = toObjectId(line.variantId ?? null);
    const key = lineKey(product, variant);
    const existing = merged.get(key);

    merged.set(key, {
      product,
      variant,
      qty: Math.max(existing?.qty ?? 0, line.qty),
      wasStored: existing?.wasStored ?? false,
    });
  }

  if (merged.size === 0) {
    return priceCart(cart);
  }

  const products = await Product.find({
    _id: { $in: [...merged.values()].map((line) => line.product) },
    ...LIVE_PRODUCT,
  }).lean<TProductResponse[]>();

  const byId = new Map(
    products.map((product) => [product._id.toString(), product]),
  );

  const items: Pick<TCartItem, "product" | "variant" | "qty">[] = [];

  for (const line of merged.values()) {
    const product = byId.get(line.product.toString());

    if (!product) {
      continue;
    }

    if (!line.wasStored && product.status !== "show") {
      continue;
    }

    if (product.isCombination) {
      const live = liveVariants(product.variants ?? []).some(
        (variant) => variant._id.toString() === line.variant?.toString(),
      );

      if (!live) {
        continue;
      }
    } else if (line.variant) {
      continue;
    }

    items.push({
      product: line.product,
      variant: line.variant,
      qty: Math.min(line.qty, CART_MAX_QTY),
    });

    if (items.length >= CART_MAX_LINES) {
      break;
    }
  }

  return priceCart(
    await upsertCart(user, { $set: { items } } as UpdateQuery<TCart>),
  );
};

export const cartServices = {
  getCart,
  setItem,
  removeItem,
  clearCart,
  mergeCart,
};
