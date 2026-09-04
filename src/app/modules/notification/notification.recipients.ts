import { Types } from "mongoose";

import { logger } from "../../shared/logger";
import { holdsPermission } from "../../utils/permissions";
import { TAuthUser } from "../auth/auth.interface";
import { Order } from "../order/order.model";
import { Role } from "../roles/roles.model";
import { UserType } from "../users/user.interface";
import { User } from "../users/user.model";
import { NOT_DELETED } from "../users/user.services";
import { NOTIFICATION_CATALOG } from "./notification.catalog";
import { NOTIFICATION_EVENTS } from "./notification.constant";
import {
  TNotificationAudience,
  TNotificationEvent,
  TNotifyInput,
  TStaffRoute,
} from "./notification.interface";

export type TStaffContact = { _id: Types.ObjectId; email?: string };

export const staffContacts = async (
  route: TStaffRoute,
): Promise<TStaffContact[]> => {
  const roles = await Role.find({
    isActive: true,
    modules: {
      $elemMatch: {
        module: route.module,
        [`permissions.${route.permission}`]: true,
      },
    },
  })
    .select("_id")
    .lean<{ _id: Types.ObjectId }[]>();

  const roleIds = roles.map((role) => role._id);

  return User.find({
    status: "active",
    ...NOT_DELETED,
    $or: [
      { userType: UserType.SuperAdmin },
      ...(roleIds.length
        ? [{ userType: UserType.Admin, role: { $in: roleIds } }]
        : []),
    ],
  })
    .select("email")
    .lean<TStaffContact[]>();
};

export const staffRecipients = async (
  route: TStaffRoute,
): Promise<Types.ObjectId[]> =>
  (await staffContacts(route)).map((user) => user._id);

export const visibleEvents = (
  caller: TAuthUser,
  audience: TNotificationAudience,
): TNotificationEvent[] =>
  NOTIFICATION_EVENTS.filter((event) => {
    const entry = NOTIFICATION_CATALOG[event];

    if (audience === "customer") {
      return Boolean(entry.customer);
    }

    const route = entry.staff?.route;
    return route
      ? holdsPermission(caller, route.module, route.permission)
      : false;
  });

/**
 * The owner comes from the order itself rather than the payload, so a wrong or stale id in a
 * producer can never route one customer's notification to another. `claimed` is the producer's
 * assertion, kept only to make a disagreement loud.
 */
export const customerRecipient = async (
  input: TNotifyInput,
  claimed: string,
): Promise<Types.ObjectId | null> => {
  switch (input.event) {
    case "order.placed":
    case "order.status":
    case "order.cancelled":
    case "order.payment": {
      const order = await Order.findById(input.orderId)
        .select("user")
        .lean<{ user: Types.ObjectId } | null>();

      // Reachable on a retry, since the job outlives the request that queued it.
      if (!order) {
        logger.error(
          `Order ${input.orderId} is gone; dropping the customer copy of "${input.event}".`,
        );
        return null;
      }

      if (claimed !== order.user.toString()) {
        logger.error(
          `"${input.event}" claimed user ${claimed} but order ${input.orderId} belongs to ${order.user.toString()}; dropping the customer copy.`,
        );
        return null;
      }

      return order.user;
    }
    default:
      logger.error(
        `No customer owner resolver for "${input.event}"; dropping the customer copy.`,
      );
      return null;
  }
};
