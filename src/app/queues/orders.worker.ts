import { Worker } from "bullmq";
import { LOW_STOCK_THRESHOLD } from "../modules/order/order.constant";
import { STAFF_ROUTES } from "../modules/notification/notification.catalog";
import { notify } from "../modules/notification/notification.emit";
import { staffContacts } from "../modules/notification/notification.recipients";
import { TOrder } from "../modules/order/order.interface";
import { Order } from "../modules/order/order.model";
import { TProductResponse } from "../modules/product/product.interface";
import { Product } from "../modules/product/product.model";
import { TUser } from "../modules/users/user.interface";
import { User } from "../modules/users/user.model";
import { logger } from "../shared/logger";
import {
  TOrderEmailParams,
  orderPlacedEmail,
  orderStatusEmail,
} from "../templates/orderEmail";
import { sendEmail } from "../utils/sendEmail";
import { sendSms } from "../utils/sendSms";
import {
  LOW_STOCK_JOB,
  ORDERS_QUEUE_NAME,
  ORDER_PLACED_JOB,
  ORDER_STATUS_JOB,
  TLowStockJob,
  TOrderPlacedJob,
  TOrderStatusJob,
} from "./orders.queue";
import { queueConnection } from "./queue.config";

const loadOrder = async (orderId: string): Promise<TOrder | null> =>
  Order.findById(orderId).lean<TOrder | null>();

const contactsFor = async (
  order: TOrder,
): Promise<{ email: string; phone: string; name: string }> => {
  const account = await User.findById(order.user)
    .select("name email phone")
    .lean<Pick<TUser, "name" | "email" | "phone"> | null>();

  return {
    email: order.address.email || account?.email || "",
    phone: order.address.contact || account?.phone || "",
    name: order.address.name || account?.name || "",
  };
};

const emailParams = (order: TOrder, name: string): TOrderEmailParams => ({
  name,
  invoice: order.invoice,
  items: order.items.map((item) => ({
    title: item.title,
    options: item.options,
    qty: item.qty,
    lineTotal: item.lineTotal,
  })),
  subtotal: order.subtotal,
  shippingCost: order.shippingCost,
  discount: order.discount,
  couponCode: order.coupon?.code,
  total: order.total,
});

const sendToContacts = async (
  to: { email: string; phone: string },
  subject: string,
  html: string,
  text: string,
  sms: string,
): Promise<void> => {
  if (to.email) {
    await sendEmail({ to: to.email, subject, html, text });
  }

  if (to.phone) {
    await sendSms(to.phone, sms);
  }
};

const runOrderPlaced = async (payload: TOrderPlacedJob) => {
  const order = await loadOrder(payload.orderId);

  if (!order) {
    return { skipped: "order no longer exists" };
  }

  const contacts = await contactsFor(order);
  const content = orderPlacedEmail(emailParams(order, contacts.name));

  await sendToContacts(
    contacts,
    content.subject,
    content.html,
    content.text,
    `Bangla Bazar: order #${order.invoice} confirmed. Total Tk ${order.total}.`,
  );

  return { notified: true };
};

const runOrderStatus = async (payload: TOrderStatusJob) => {
  const order = await loadOrder(payload.orderId);

  if (!order) {
    return { skipped: "order no longer exists" };
  }

  const contacts = await contactsFor(order);

  const content = orderStatusEmail(
    payload.status,
    emailParams(order, contacts.name),
  );

  if (!content) {
    return { skipped: `no notice for status "${payload.status}"` };
  }

  await sendToContacts(
    contacts,
    content.subject,
    content.html,
    content.text,
    `Bangla Bazar: order #${order.invoice} is now ${payload.status}.`,
  );

  return { notified: true };
};

const runLowStock = async (payload: TLowStockJob) => {
  const products = await Product.find({
    _id: { $in: payload.productIds },
    isDeleted: { $ne: true },
    stock: { $lte: LOW_STOCK_THRESHOLD },
  })
    .select("title sku stock")
    .lean<TProductResponse[]>();

  if (products.length === 0) {
    return { low: 0 };
  }

  const staff = await staffContacts(STAFF_ROUTES.products);
  const addresses = staff
    .map((member) => member.email)
    .filter((email): email is string => Boolean(email));

  const lines = products.map(
    (product) =>
      `${product.title}${product.sku ? ` (${product.sku})` : ""} — ${product.stock} left`,
  );

  logger.warn(`Low stock: ${lines.join("; ")}`);

  for (const product of products) {
    notify({
      event: "product.low_stock",
      productId: product._id.toString(),
      title: product.title,
      sku: product.sku,
      stock: product.stock,
    });
  }

  const text = ["These products are running low:", "", ...lines].join("\n");
  const html = `<p>These products are running low:</p><ul>${lines
    .map((line) => `<li>${line}</li>`)
    .join("")}</ul>`;

  for (const address of addresses) {
    await sendEmail({
      to: address,
      subject: `Bangla Bazar — ${products.length} product${products.length === 1 ? "" : "s"} low on stock`,
      html,
      text,
    });
  }

  return { low: products.length, alerted: addresses.length };
};

export const startOrdersWorker = (): Worker => {
  const worker = new Worker(
    ORDERS_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case ORDER_PLACED_JOB:
          return runOrderPlaced(job.data as TOrderPlacedJob);
        case ORDER_STATUS_JOB:
          return runOrderStatus(job.data as TOrderStatusJob);
        case LOW_STOCK_JOB:
          return runLowStock(job.data as TLowStockJob);
        default:
          return null;
      }
    },
    queueConnection,
  );

  worker.on("failed", (job, err) => {
    logger.error(`Order job "${job?.name}" failed: ${err.message}`);
  });

  return worker;
};
