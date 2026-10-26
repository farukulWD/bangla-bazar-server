import { Types } from "mongoose";

import { PermissionModule, TAnyPermission } from "../../constants/permissions";
import { TOrderStatus, TPaymentStatus } from "../order/order.interface";
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_EVENTS,
  NOTIFICATION_SUBJECT_KINDS,
} from "./notification.constant";

export type TNotificationAudience = (typeof NOTIFICATION_AUDIENCES)[number];
export type TNotificationEvent = (typeof NOTIFICATION_EVENTS)[number];
export type TNotificationSubjectKind =
  (typeof NOTIFICATION_SUBJECT_KINDS)[number];

export type TNotificationSubject = {
  kind: TNotificationSubjectKind;
  id: string;
  code?: string;
};

export type TNotification = {
  _id: Types.ObjectId;
  user: Types.ObjectId;
  audience: TNotificationAudience;
  event: TNotificationEvent;
  title: string;
  body: string;
  subject: TNotificationSubject;
  link: string;
  dedupeKey: string;
  readAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type TNotificationView = {
  id: string;
  event: TNotificationEvent;
  audience: TNotificationAudience;
  title: string;
  body: string;
  subject: TNotificationSubject;
  link: string;
  read: boolean;
  createdAt: Date;
};

export type TUnreadCount = { count: number };
export type TMarkReadResult = { updated: number };

type TActor = { actorId?: string };

export type TNotifyInput = TActor &
  (
    | {
        event: "order.placed";
        orderId: string;
        userId: string;
        invoice: number;
        total: number;
      }
    | {
        event: "order.status";
        orderId: string;
        userId: string;
        invoice: number;
        status: TOrderStatus;
      }
    | {
        event: "order.cancelled";
        orderId: string;
        userId: string;
        invoice: number;
      }
    | {
        event: "order.payment";
        orderId: string;
        userId: string;
        invoice: number;
        paymentStatus: TPaymentStatus;
      }
    | {
        event: "product.low_stock";
        productId: string;
        title: string;
        sku?: string;
        stock: number;
      }
    | {
        event: "coupon.expiring";
        couponId: string;
        couponCode: string;
        endTime: string;
      }
    | {
        event: "review.submitted";
        reviewId: string;
        productId: string;
        productTitle: string;
        rating: number;
      }
  );

export type TNotifyOf<E extends TNotificationEvent> = Extract<
  TNotifyInput,
  { event: E }
>;

export type TRendered = {
  title: string;
  body: string;
  link: string;
  subject: TNotificationSubject;
};

export type TStaffRoute = {
  module: PermissionModule;
  permission: TAnyPermission;
};

export type TCatalogEntry<E extends TNotificationEvent> = {
  enabled: boolean;
  customer?: {
    claimedRecipient: (input: TNotifyOf<E>) => string;
    render: (input: TNotifyOf<E>) => TRendered | null;
  };
  staff?: {
    route: TStaffRoute;
    render: (input: TNotifyOf<E>) => TRendered | null;
  };
  dedupeKey: (input: TNotifyOf<E>) => string;
};

export type TCatalog = { [E in TNotificationEvent]: TCatalogEntry<E> };

export type TNotificationDraft = Pick<
  TNotification,
  | "user"
  | "audience"
  | "event"
  | "title"
  | "body"
  | "subject"
  | "link"
  | "dedupeKey"
  | "readAt"
>;
