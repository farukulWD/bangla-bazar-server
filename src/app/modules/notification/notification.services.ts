import httpStatus from "http-status";
import { QueryFilter, Types } from "mongoose";

import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { publishNotification } from "../../realtime/realtime.emit";
import { TAuthUser } from "../auth/auth.interface";
import { STAFF_USER_TYPES } from "../users/user.interface";
import { NOTIFICATION_CATALOG, isEventEnabled } from "./notification.catalog";
import {
  NOTIFICATION_AUDIENCES,
  NOTIFICATION_INSERT_BATCH,
  NOTIFICATION_LIST_LIMIT_DEFAULT,
  NOTIFICATION_LIST_LIMIT_MAX,
} from "./notification.constant";
import {
  TCatalogEntry,
  TMarkReadResult,
  TNotification,
  TNotificationAudience,
  TNotificationDraft,
  TNotificationEvent,
  TNotificationView,
  TNotifyInput,
  TUnreadCount,
} from "./notification.interface";
import { Notification } from "./notification.model";
import {
  customerRecipient,
  staffRecipients,
  visibleEvents,
} from "./notification.recipients";

/**
 * The catalog is keyed by event and each entry is narrowed to its own input, but at
 * runtime the event is only known from the value. Widening to the union entry is
 * safe because the key and the input carry the same `event`.
 */
const entryOf = (input: TNotifyInput): TCatalogEntry<TNotificationEvent> =>
  NOTIFICATION_CATALOG[input.event] as TCatalogEntry<TNotificationEvent>;

const toView = (row: TNotification): TNotificationView => ({
  id: row._id.toString(),
  event: row.event,
  audience: row.audience,
  title: row.title,
  body: row.body,
  subject: row.subject,
  link: row.link,
  read: row.readAt !== null,
  createdAt: row.createdAt,
});

/* ------------------------------------------------------------------ delivery */

const buildDrafts = async (
  input: TNotifyInput,
): Promise<TNotificationDraft[]> => {
  const entry = entryOf(input);
  const dedupeKey = entry.dedupeKey(input);
  const drafts: TNotificationDraft[] = [];

  if (entry.staff) {
    const rendered = entry.staff.render(input);

    if (rendered) {
      const recipients = (await staffRecipients(entry.staff.route)).filter(
        (user) => user.toString() !== input.actorId,
      );

      for (const user of recipients) {
        drafts.push({
          user,
          audience: "staff",
          event: input.event,
          dedupeKey,
          readAt: null,
          ...rendered,
        });
      }
    }
  }

  if (entry.customer) {
    const rendered = entry.customer.render(input);

    if (rendered) {
      const owner = await customerRecipient(
        input,
        entry.customer.claimedRecipient(input),
      );

      if (owner) {
        drafts.push({
          user: owner,
          audience: "customer",
          event: input.event,
          dedupeKey,
          readAt: null,
          ...rendered,
        });
      }
    }
  }

  return drafts;
};

const asPlain = (row: unknown): TNotification => {
  const doc = row as { toObject?: () => TNotification };
  return typeof doc.toObject === "function"
    ? doc.toObject()
    : (row as TNotification);
};

/** Mongoose hangs the documents that did land on the error. */
const insertedFrom = (error: unknown): TNotification[] => {
  const docs = (error as { insertedDocs?: unknown }).insertedDocs;
  return Array.isArray(docs) ? docs.map(asPlain) : [];
};

/**
 * `error.code` carries the *first* write error only, so a batch that mixes a duplicate with
 * anything else would rethrow below and the rows that did land would never reach a bell —
 * the retry then finds them all duplicated and `insertedDocs` comes back empty.
 */
const isDuplicateKeyError = (error: unknown): boolean => {
  const { code, writeErrors } = error as {
    code?: unknown;
    writeErrors?: { code?: unknown }[];
  };

  return Array.isArray(writeErrors) && writeErrors.length > 0
    ? writeErrors.every((write) => write.code === 11000)
    : code === 11000;
};

const publishToBells = (rows: TNotification[]): void => {
  for (const row of rows) {
    publishNotification(row.user.toString(), toView(row));
  }
};

const deliver = async (input: TNotifyInput): Promise<{ created: number }> => {
  if (!isEventEnabled(input.event)) {
    return { created: 0 };
  }

  const drafts = await buildDrafts(input);
  let created = 0;

  for (let at = 0; at < drafts.length; at += NOTIFICATION_INSERT_BATCH) {
    const batch = drafts.slice(at, at + NOTIFICATION_INSERT_BATCH);

    try {
      const rows = await Notification.insertMany(batch, { ordered: false });
      const written = rows.map(asPlain);

      created += written.length;
      publishToBells(written);
    } catch (error) {
      if (!isDuplicateKeyError(error)) {
        throw error;
      }

      const written = insertedFrom(error);
      created += written.length;
      publishToBells(written);
    }
  }

  return { created };
};

/* -------------------------------------------------------------------- reads */

const isAudience = (value: unknown): value is TNotificationAudience =>
  (NOTIFICATION_AUDIENCES as readonly string[]).includes(value as string);

const resolveAudience = (
  caller: TAuthUser,
  requested: unknown,
): TNotificationAudience => {
  const isStaff = STAFF_USER_TYPES.includes(caller.userType);

  if (isAudience(requested)) {
    if (requested === "staff" && !isStaff) {
      throw new AppError(httpStatus.FORBIDDEN, "You do not have a staff inbox");
    }
    return requested;
  }

  return isStaff ? "staff" : "customer";
};

const parseRead = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) {
    return true;
  }
  if (value === "false" || value === false) {
    return false;
  }
  return undefined;
};

const visibleFilter = (
  caller: TAuthUser,
  audience: TNotificationAudience,
  read?: boolean,
): QueryFilter<TNotification> => ({
  user: caller._id,
  audience,
  event: { $in: visibleEvents(caller, audience) },
  ...(read === undefined
    ? {}
    : read
      ? { readAt: { $ne: null } }
      : { readAt: null }),
});

/** The same rule across both inboxes, for the paths that are not given an audience. */
const readableScope = (caller: TAuthUser): QueryFilter<TNotification> => ({
  user: caller._id,
  $or: NOTIFICATION_AUDIENCES.map((audience) => ({
    audience,
    event: { $in: visibleEvents(caller, audience) },
  })),
});

const listNotifications = async (
  caller: TAuthUser,
  query: Record<string, unknown>,
): Promise<{ data: TNotificationView[]; pagination: TPagination }> => {
  const audience = resolveAudience(caller, query.audience);
  const read = parseRead(query.read);

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(
    NOTIFICATION_LIST_LIMIT_MAX,
    Math.max(1, Number(query.limit) || NOTIFICATION_LIST_LIMIT_DEFAULT),
  );

  // No `.filter()`: there is no legitimate passthrough filter for an inbox, and one would
  // only give a caller a way to argue with the scope above. No `.fields()` either — `toView`
  // fixes the shape anyway, and a projection that drops `_id` crashes it.
  const notificationQuery = new QueryBuilder(
    Notification.find(visibleFilter(caller, audience, read)),
    { ...query, page, limit },
  ).sort();

  await notificationQuery.paginate();

  const rows = await notificationQuery.modelQuery
    .select("-__v")
    .lean<TNotification[]>();

  return {
    data: rows.map(toView),
    pagination: {
      page,
      limit,
      total: notificationQuery.total,
      totalPage: Math.ceil(notificationQuery.total / limit),
    },
  };
};

const getUnreadCount = async (
  caller: TAuthUser,
  query: Record<string, unknown>,
): Promise<TUnreadCount> => {
  const audience = resolveAudience(caller, query.audience);

  const count = await Notification.countDocuments(
    visibleFilter(caller, audience, false),
  );

  return { count };
};

const markRead = async (
  caller: TAuthUser,
  id: string,
): Promise<TMarkReadResult> => {
  if (!Types.ObjectId.isValid(id)) {
    throw new AppError(httpStatus.NOT_FOUND, "Notification not found");
  }

  const result = await Notification.updateOne(
    { _id: new Types.ObjectId(id), readAt: null, ...readableScope(caller) },
    { $set: { readAt: new Date() } },
  );

  return { updated: result.modifiedCount };
};

const markAllRead = async (
  caller: TAuthUser,
  query: Record<string, unknown>,
): Promise<TMarkReadResult> => {
  const audience = resolveAudience(caller, query.audience);

  // Deliberately not `visibleFilter`: this returns no data, so there is nothing to leak by
  // clearing rows the caller cannot currently see — and leaving them unread would dump a
  // backlog into the badge the moment a revoked permission is granted again.
  const result = await Notification.updateMany(
    { user: caller._id, audience, readAt: null },
    { $set: { readAt: new Date() } },
  );

  return { updated: result.modifiedCount };
};

export const notificationServices = {
  deliver,
  listNotifications,
  getUnreadCount,
  markRead,
  markAllRead,
};
