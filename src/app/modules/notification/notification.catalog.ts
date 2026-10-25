import {
  CouponPermission,
  OrderPermission,
  PermissionModule,
  ProductPermission,
} from "../../constants/permissions";
import { formatMoney } from "../../utils/money";
import { TOrderStatus, TPaymentStatus } from "../order/order.interface";
import {
  TCatalog,
  TNotificationEvent,
  TRendered,
  TStaffRoute,
} from "./notification.interface";

const invoiceCode = (invoice: number): string => `#${invoice}`;

const today = (): string => new Date().toISOString().slice(0, 10);

const orders: TStaffRoute = {
  module: PermissionModule.Order,
  permission: OrderPermission.ViewOrders,
};

const products: TStaffRoute = {
  module: PermissionModule.Product,
  permission: ProductPermission.ViewProducts,
};

const coupons: TStaffRoute = {
  module: PermissionModule.Coupon,
  permission: CouponPermission.ViewCoupons,
};

export const STAFF_ROUTES = { orders, products, coupons } as const;

const orderSubject = (orderId: string, invoice: number) => ({
  kind: "order" as const,
  id: orderId,
  code: invoiceCode(invoice),
});

const STATUS_COPY: Partial<
  Record<TOrderStatus, { customer: string; staff: string }>
> = {
  processing: {
    customer: "We are packing your order now.",
    staff: "moved to processing.",
  },
  shipped: {
    customer: "Your order is on its way.",
    staff: "has been shipped.",
  },
  delivered: {
    customer: "Your order has been delivered. Enjoy!",
    staff: "was delivered.",
  },
};

const PAYMENT_COPY: Partial<
  Record<TPaymentStatus, { customer: string; staff: string }>
> = {
  paid: {
    customer: "We have received your payment.",
    staff: "was marked paid.",
  },
  refunded: {
    customer: "Your payment has been refunded.",
    staff: "was refunded.",
  },
  failed: {
    customer: "Your payment could not be completed.",
    staff: "has a failed payment.",
  },
};

export const NOTIFICATION_CATALOG: TCatalog = {
  "order.placed": {
    enabled: true,
    dedupeKey: (input) => `order.placed:${input.orderId}`,
    customer: {
      claimedRecipient: (input) => input.userId,
      render: (input): TRendered => ({
        title: "Order placed",
        body: `Order ${invoiceCode(input.invoice)} — ${formatMoney(input.total)}. We will confirm it shortly.`,
        link: `/orders/${input.orderId}`,
        subject: orderSubject(input.orderId, input.invoice),
      }),
    },
    staff: {
      route: orders,
      render: (input): TRendered => ({
        title: "New order placed",
        body: `Order ${invoiceCode(input.invoice)} — ${formatMoney(input.total)}.`,
        link: `/orders/${input.orderId}`,
        subject: orderSubject(input.orderId, input.invoice),
      }),
    },
  },

  "order.status": {
    enabled: true,
    dedupeKey: (input) => `order.status:${input.orderId}:${input.status}`,
    customer: {
      claimedRecipient: (input) => input.userId,
      render: (input): TRendered | null => {
        const copy = STATUS_COPY[input.status];
        if (!copy) {
          return null;
        }

        return {
          title: `Order ${invoiceCode(input.invoice)} is ${input.status}`,
          body: copy.customer,
          link: `/orders/${input.orderId}`,
          subject: orderSubject(input.orderId, input.invoice),
        };
      },
    },
    staff: {
      route: orders,
      render: (input): TRendered | null => {
        const copy = STATUS_COPY[input.status];
        if (!copy) {
          return null;
        }

        return {
          title: "Order status changed",
          body: `Order ${invoiceCode(input.invoice)} ${copy.staff}`,
          link: `/orders/${input.orderId}`,
          subject: orderSubject(input.orderId, input.invoice),
        };
      },
    },
  },

  "order.cancelled": {
    enabled: true,
    dedupeKey: (input) => `order.cancelled:${input.orderId}`,
    customer: {
      claimedRecipient: (input) => input.userId,
      render: (input): TRendered => ({
        title: "Order cancelled",
        body: `Order ${invoiceCode(input.invoice)} has been cancelled.`,
        link: `/orders/${input.orderId}`,
        subject: orderSubject(input.orderId, input.invoice),
      }),
    },
    staff: {
      route: orders,
      render: (input): TRendered => ({
        title: "Order cancelled",
        body: `Order ${invoiceCode(input.invoice)} was cancelled and its stock returned.`,
        link: `/orders/${input.orderId}`,
        subject: orderSubject(input.orderId, input.invoice),
      }),
    },
  },

  "order.payment": {
    enabled: true,
    dedupeKey: (input) =>
      `order.payment:${input.orderId}:${input.paymentStatus}`,
    customer: {
      claimedRecipient: (input) => input.userId,
      render: (input): TRendered | null => {
        const copy = PAYMENT_COPY[input.paymentStatus];
        if (!copy) {
          return null;
        }

        return {
          title: `Payment ${input.paymentStatus}`,
          body: `Order ${invoiceCode(input.invoice)}: ${copy.customer}`,
          link: `/orders/${input.orderId}`,
          subject: orderSubject(input.orderId, input.invoice),
        };
      },
    },
    staff: {
      route: orders,
      render: (input): TRendered | null => {
        const copy = PAYMENT_COPY[input.paymentStatus];
        if (!copy) {
          return null;
        }

        return {
          title: "Payment status changed",
          body: `Order ${invoiceCode(input.invoice)} ${copy.staff}`,
          link: `/orders/${input.orderId}`,
          subject: orderSubject(input.orderId, input.invoice),
        };
      },
    },
  },

  "product.low_stock": {
    enabled: true,
    // Dated, so a product that keeps selling rings once a day rather than once a sale.
    dedupeKey: (input) => `product.low_stock:${input.productId}:${today()}`,
    staff: {
      route: products,
      render: (input): TRendered => ({
        title: "Product running low",
        body: `${input.title}${input.sku ? ` (${input.sku})` : ""} — ${input.stock} left.`,
        link: `/products/${input.productId}`,
        subject: {
          kind: "product",
          id: input.productId,
          code: input.sku,
        },
      }),
    },
  },

  "coupon.expiring": {
    enabled: true,
    // Keyed on the expiry date, so re-running the sweep is free.
    dedupeKey: (input) =>
      `coupon.expiring:${input.couponId}:${input.endTime.slice(0, 10)}`,
    staff: {
      route: coupons,
      render: (input): TRendered => ({
        title: "Coupon expiring soon",
        body: `${input.couponCode} expires on ${input.endTime.slice(0, 10)}.`,
        link: `/coupons/${input.couponId}`,
        subject: {
          kind: "coupon",
          id: input.couponId,
          code: input.couponCode,
        },
      }),
    },
  },
};

export const isEventEnabled = (event: TNotificationEvent): boolean =>
  NOTIFICATION_CATALOG[event].enabled;
