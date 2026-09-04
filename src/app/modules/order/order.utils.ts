import httpStatus from "http-status";
import { ClientSession, Types } from "mongoose";

import AppError from "../../errors/AppError";
import { TErrorSourse } from "../../interface/error.interface";
import { TCartView } from "../cart/cart.interface";
import { Product } from "../product/product.model";
import { TCheckoutSettings } from "../settings/settings.interface";
import { ORDER_COUNTER_ID, ORDER_INVOICE_SEED } from "./order.constant";
import { TOrder, TOrderItem, TShippingKey } from "./order.interface";
import { OrderCounter } from "./order.model";

export const badRequest = (message: string, path: string) =>
  new AppError(httpStatus.BAD_REQUEST, message, "", [{ path, message }]);

export const assertBasketIsBuyable = (view: TCartView): void => {
  if (view.items.length === 0) {
    throw badRequest("Your cart is empty", "items");
  }

  const problems: TErrorSourse = [];

  for (const line of view.items) {
    if (!line.isAvailable) {
      problems.push({
        path: line.lineId,
        message: `"${line.title}" ${line.unavailableReason ?? "is no longer available"}`,
      });
      continue;
    }

    if (line.qty > line.stock) {
      problems.push({
        path: line.lineId,
        message: `Only ${line.stock} of "${line.title}" left`,
      });
    }
  }

  if (problems.length > 0) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Some items in your cart are no longer available",
      "",
      problems,
    );
  }
};

export const resolveShipping = (
  key: TShippingKey,
  subtotal: number,
  checkout: TCheckoutSettings,
): { fee: number } => {
  const option = checkout.shipping[key];

  if (!option || !option.enabled) {
    throw badRequest("That delivery option is not available", "shippingOption");
  }

  const waived = key === "standard" && subtotal >= checkout.freeDeliveryOver;

  return { fee: waived ? 0 : option.fee };
};

export const toOrderItems = (view: TCartView): TOrderItem[] =>
  view.items.map((line) => ({
    product: new Types.ObjectId(line.productId),
    variant: line.variantId ? new Types.ObjectId(line.variantId) : null,
    title: line.title,
    slug: line.slug,
    image: line.image,
    sku: line.sku,
    options: line.options,
    price: line.price,
    originalPrice: line.originalPrice,
    qty: line.qty,
    lineTotal: line.lineTotal,
  }));

export const nextInvoice = async (session: ClientSession): Promise<number> => {
  await OrderCounter.updateOne(
    { _id: ORDER_COUNTER_ID },
    { $setOnInsert: { seq: ORDER_INVOICE_SEED } },
    { upsert: true, session },
  );

  const counter = await OrderCounter.findOneAndUpdate(
    { _id: ORDER_COUNTER_ID },
    { $inc: { seq: 1 } },
    { new: true, session },
  ).lean<{ seq: number } | null>();

  if (!counter) {
    throw new AppError(
      httpStatus.INTERNAL_SERVER_ERROR,
      "Could not allocate an invoice number",
    );
  }

  return counter.seq;
};

export const decrementStock = async (
  items: TOrderItem[],
  session: ClientSession,
): Promise<void> => {
  for (const line of items) {
    const result = await Product.updateOne(
      line.variant
        ? {
            _id: line.product,
            isDeleted: { $ne: true },
            status: "show",
            variants: {
              $elemMatch: {
                _id: line.variant,
                isDeleted: { $ne: true },
                stock: { $gte: line.qty },
              },
            },
          }
        : {
            _id: line.product,
            isDeleted: { $ne: true },
            status: "show",
            isCombination: false,
            stock: { $gte: line.qty },
          },
      line.variant
        ? {
            $inc: {
              "variants.$.stock": -line.qty,
              stock: -line.qty,
              sales: line.qty,
            },
          }
        : { $inc: { stock: -line.qty, sales: line.qty } },
      { session },
    );

    if (result.matchedCount === 0) {
      throw badRequest(
        `"${line.title}" sold out while you were checking out`,
        line.product.toString(),
      );
    }
  }
};

export const restoreStock = async (
  items: TOrderItem[],
  session: ClientSession,
): Promise<void> => {
  for (const line of items) {
    await Product.updateOne(
      line.variant
        ? { _id: line.product, variants: { $elemMatch: { _id: line.variant } } }
        : { _id: line.product },
      line.variant
        ? {
            $inc: {
              "variants.$.stock": line.qty,
              stock: line.qty,
              sales: -line.qty,
            },
          }
        : { $inc: { stock: line.qty, sales: -line.qty } },
      { session },
    );
  }
};

export const parseDate = (
  value: unknown,
  endOfDay: boolean,
): Date | undefined => {
  if (typeof value !== "string" || !value.trim()) {
    return undefined;
  }

  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
};

/** Mongo has no literal-string escape, so a search term must not carry regex. */
export const escapeRegex = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const csvCell = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "";
  }

  const raw = value instanceof Date ? value.toISOString() : String(value);
  const safe = /^[=+\-@\t\r]/.test(raw) ? `'${raw}` : raw;

  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

const csvRow = (cells: unknown[]): string =>
  `${cells.map(csvCell).join(",")}\r\n`;

export const ORDER_EXPORT_COLUMNS = [
  "invoice",
  "placed_at",
  "status",
  "payment_method",
  "payment_status",
  "customer_name",
  "customer_contact",
  "customer_email",
  "city",
  "area",
  "address",
  "zip_code",
  "shipping_option",
  "item_title",
  "item_sku",
  "item_options",
  "item_qty",
  "item_unit_price",
  "item_line_total",
  "order_subtotal",
  "order_shipping",
  "coupon_code",
  "order_discount",
  "order_total",
] as const;

export const ORDER_EXPORT_HEADER = csvRow([...ORDER_EXPORT_COLUMNS]);

export const orderToCsvRows = (order: TOrder): string[] =>
  order.items.map((item, index) => {
    const first = index === 0;

    return csvRow([
      order.invoice,
      order.createdAt,
      order.status,
      order.paymentMethod,
      order.paymentStatus,
      order.address.name,
      order.address.contact,
      order.address.email,
      order.address.city,
      order.address.area,
      order.address.address,
      order.address.zipCode,
      order.shippingOption,
      item.title,
      item.sku,
      item.options
        .map((option) => `${option.attribute}: ${option.value}`)
        .join("; "),
      item.qty,
      item.price,
      item.lineTotal,
      first ? order.subtotal : "",
      first ? order.shippingCost : "",
      first ? (order.coupon?.code ?? "") : "",
      first ? order.discount : "",
      first ? order.total : "",
    ]);
  });

export const toInvoice = (order: TOrder) => ({
  invoice: order.invoice,
  placedAt: order.createdAt,
  status: order.status,
  billTo: order.address,
  items: order.items.map((item) => ({
    title: item.title,
    sku: item.sku,
    options: item.options,
    qty: item.qty,
    price: item.price,
    lineTotal: item.lineTotal,
  })),
  subtotal: order.subtotal,
  shippingCost: order.shippingCost,
  discount: order.discount,
  coupon: order.coupon,
  total: order.total,
  shippingOption: order.shippingOption,
  paymentMethod: order.paymentMethod,
  paymentStatus: order.paymentStatus,
  paidAt: order.paidAt,
  deliveredAt: order.deliveredAt,
});
