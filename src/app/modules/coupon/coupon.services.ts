import httpStatus from "http-status";
import { ClientSession, Types } from "mongoose";
import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { sendImageToCloudinary } from "../../utils/sendImageToCloudinary";
import {
  COUPON_QUERY_CONTROL_KEYS,
  COUPON_SEARCHABLE_FIELDS,
} from "./coupon.constant";
import {
  TApplyCouponResult,
  TBulkResult,
  TCouponDocument,
  TCouponStatus,
  TCreateCoupon,
  TUpdateCoupon,
} from "./coupon.interface";
import { Coupon } from "./coupon.model";
import {
  calculateDiscount,
  normalizeCouponCode,
  toPayable,
} from "./coupon.utils";
import { couponRowSchema } from "./coupon.validation";

const NOT_DELETED = { isDeleted: { $ne: true } };

const uploadLogo = async (file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `coupon-logo-${Date.now()}`,
    file.path,
    file.mimetype,
  );
  return uploadResult.secure_url as string;
};

const findCouponOrThrow = async (id: string): Promise<TCouponDocument> => {
  const coupon = await Coupon.findOne({ _id: id, ...NOT_DELETED });

  if (!coupon) {
    throw new AppError(httpStatus.NOT_FOUND, "Coupon not found");
  }

  return coupon;
};

const codeTakenError = (code: string) => {
  const message = `The coupon code "${code}" is already in use`;
  return new AppError(httpStatus.CONFLICT, message, "", [
    { path: "couponCode", message },
  ]);
};

const assertCouponCodeIsFree = async (
  code: string,
  excludeId?: Types.ObjectId,
): Promise<void> => {
  const clash = await Coupon.exists({
    couponCode: code,
    ...NOT_DELETED,
    ...(excludeId ? { _id: { $ne: excludeId } } : {}),
  });

  if (clash) throw codeTakenError(code);
};

const assertWindowIsSane = (
  startTime: Date | undefined,
  endTime: Date,
): void => {
  if (startTime && endTime.getTime() <= startTime.getTime()) {
    const message = "The coupon must end after it starts";
    throw new AppError(httpStatus.BAD_REQUEST, message, "", [
      { path: "endTime", message },
    ]);
  }
};

const parseDate = (value: string | undefined): Date | undefined =>
  value === undefined ? undefined : new Date(value);

const createCoupon = async (
  payload: TCreateCoupon,
  file?: Express.Multer.File,
): Promise<TCouponDocument> => {
  const couponCode = normalizeCouponCode(payload.couponCode);
  await assertCouponCodeIsFree(couponCode);

  const coupon = await Coupon.create({
    title: payload.title,
    couponCode,
    logo: file ? await uploadLogo(file) : payload.logo,
    startTime: parseDate(payload.startTime),
    endTime: new Date(payload.endTime),
    discountType: payload.discountType,
    discountValue: payload.discountValue,
    maxDiscountAmount:
      payload.discountType === "percentage"
        ? payload.maxDiscountAmount
        : undefined,
    minimumAmount: payload.minimumAmount ?? 0,
    status: payload.status,
  });

  return coupon;
};

const bulkCreateCoupons = async (payload: unknown[]): Promise<TBulkResult> => {
  const failed: TBulkResult["failed"] = [];
  const claimedCodes = new Set<string>();
  let succeeded = 0;

  for (const [index, entry] of payload.entries()) {
    const parsed = couponRowSchema.safeParse(entry);

    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      failed.push({
        index,
        identifier:
          entry && typeof entry === "object" && "couponCode" in entry
            ? String((entry as { couponCode: unknown }).couponCode)
            : undefined,
        error: issue
          ? `${issue.path.join(".") || "row"}: ${issue.message}`
          : "Invalid coupon",
      });
      continue;
    }

    const row = parsed.data;
    const couponCode = normalizeCouponCode(row.couponCode);

    try {
      if (claimedCodes.has(couponCode)) throw codeTakenError(couponCode);
      await createCoupon({ ...row, couponCode });

      claimedCodes.add(couponCode);
      succeeded += 1;
    } catch (error) {
      failed.push({
        index,
        identifier: couponCode,
        error: error instanceof Error ? error.message : "Could not be created",
      });
    }
  }

  return { succeeded, failed };
};

const getCoupons = async (
  query: Record<string, unknown>,
): Promise<{ data: TCouponDocument[]; pagination: TPagination }> => {
  const from = query.from ? new Date(String(query.from)) : undefined;
  const to = query.to ? new Date(String(query.to)) : undefined;

  const couponQuery = new QueryBuilder(Coupon.find(NOT_DELETED), query)
    .search(COUPON_SEARCHABLE_FIELDS)
    .filter(COUPON_QUERY_CONTROL_KEYS)
    .dateRange("endTime", from, to)
    .sort();

  await couponQuery.paginate();
  couponQuery.fields();

  const coupons = await couponQuery.modelQuery;

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data: coupons,
    pagination: {
      page,
      limit,
      total: couponQuery.total,
      totalPage: Math.ceil(couponQuery.total / limit),
    },
  };
};

const getShowingCoupons = async (): Promise<TCouponDocument[]> => {
  const now = new Date();

  const coupons = await Coupon.find({
    ...NOT_DELETED,
    status: "show",
    endTime: { $gt: now },
    $or: [{ startTime: { $lte: now } }, { startTime: { $exists: false } }],
  }).sort({ createdAt: -1 });

  return coupons;
};

const getCouponById = async (id: string): Promise<TCouponDocument> =>
  findCouponOrThrow(id);

const updateCoupon = async (
  id: string,
  payload: TUpdateCoupon,
  file?: Express.Multer.File,
): Promise<TCouponDocument> => {
  const coupon = await findCouponOrThrow(id);

  if (payload.couponCode !== undefined) {
    const couponCode = normalizeCouponCode(payload.couponCode);
    await assertCouponCodeIsFree(couponCode, coupon._id);
    coupon.couponCode = couponCode;
  }

  if (payload.title !== undefined) coupon.title = payload.title;
  if (payload.startTime !== undefined) {
    coupon.startTime = new Date(payload.startTime);
  }
  if (payload.endTime !== undefined) coupon.endTime = new Date(payload.endTime);
  if (payload.discountType !== undefined) {
    coupon.discountType = payload.discountType;
  }
  if (payload.discountValue !== undefined) {
    coupon.discountValue = payload.discountValue;
  }
  if (payload.maxDiscountAmount !== undefined) {
    coupon.maxDiscountAmount = payload.maxDiscountAmount;
  }
  if (payload.minimumAmount !== undefined) {
    coupon.minimumAmount = payload.minimumAmount;
  }
  if (payload.status !== undefined) coupon.status = payload.status;

  if (file) {
    coupon.logo = await uploadLogo(file);
  } else if (payload.logo !== undefined) {
    coupon.logo = payload.logo;
  }

  // A cap only means something for a percentage, so switching type clears it.
  if (coupon.discountType !== "percentage") {
    coupon.maxDiscountAmount = undefined;
  }

  // The request may have moved only one bound; the pair is checked as stored.
  assertWindowIsSane(coupon.startTime, coupon.endTime);

  await coupon.save();

  return coupon;
};

const updateCouponStatus = async (
  id: string,
  status: TCouponStatus,
): Promise<TCouponDocument> => {
  const coupon = await findCouponOrThrow(id);

  coupon.status = status;
  await coupon.save();

  return coupon;
};

const deleteCoupon = async (id: string): Promise<{ deleted: number }> => {
  const coupon = await findCouponOrThrow(id);

  coupon.isDeleted = true;
  await coupon.save();

  return { deleted: 1 };
};

/** The legacy `updateManyCoupons` surface: the publish window and the status. */
const bulkUpdateCoupons = async (
  ids: string[],
  payload: Pick<TUpdateCoupon, "status" | "startTime" | "endTime">,
): Promise<TBulkResult> => {
  const update: Record<string, unknown> = {};

  if (payload.status !== undefined) update.status = payload.status;
  if (payload.startTime !== undefined) {
    update.startTime = new Date(payload.startTime);
  }
  if (payload.endTime !== undefined) update.endTime = new Date(payload.endTime);

  if (!Object.keys(update).length) {
    throw new AppError(httpStatus.BAD_REQUEST, "Nothing to update");
  }

  const result = await Coupon.updateMany(
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
            error: `${missing} of the selected coupons no longer exist`,
          },
        ]
      : [],
  };
};

const bulkDeleteCoupons = async (ids: string[]): Promise<TBulkResult> => {
  const result = await Coupon.updateMany(
    { _id: { $in: ids }, ...NOT_DELETED },
    { isDeleted: true },
  );

  const missing = ids.length - result.matchedCount;

  return {
    succeeded: result.matchedCount,
    failed: missing
      ? [
          {
            index: -1,
            error: `${missing} of the selected coupons no longer exist`,
          },
        ]
      : [],
  };
};

const couponRejected = (message: string) =>
  new AppError(httpStatus.BAD_REQUEST, message, "", [
    { path: "couponCode", message },
  ]);

/**
 * The storefront used to decide client-side whether a code was valid and what it was
 * worth, so a crafted request could claim any discount. The window, the status and
 * the minimum are all settled here instead.
 */
const applyCoupon = async (
  code: string,
  cartTotal: number,
  session?: ClientSession,
): Promise<TApplyCouponResult> => {
  const now = new Date();
  const couponCode = normalizeCouponCode(code);

  // The session is passed when placing an order, so the code is read in the same
  // transaction that prices and commits it.
  const coupon = await Coupon.findOne({
    couponCode,
    status: "show",
    ...NOT_DELETED,
  }).session(session ?? null);

  // A hidden coupon is reported as unknown rather than as hidden: the difference
  // would tell a caller which unpublished codes exist.
  if (!coupon) {
    const message = "That coupon code is not valid";
    throw new AppError(httpStatus.NOT_FOUND, message, "", [
      { path: "couponCode", message },
    ]);
  }

  if (coupon.startTime && coupon.startTime.getTime() > now.getTime()) {
    throw couponRejected("This coupon is not active yet");
  }

  if (coupon.endTime.getTime() <= now.getTime()) {
    throw couponRejected("This coupon has expired");
  }

  if (cartTotal < coupon.minimumAmount) {
    throw couponRejected(
      `Spend at least ${coupon.minimumAmount} to use this coupon`,
    );
  }

  const discount = calculateDiscount(coupon, cartTotal);

  return {
    coupon,
    discount,
    payable: toPayable(cartTotal, discount),
  };
};

export const couponServices = {
  createCoupon,
  bulkCreateCoupons,
  getCoupons,
  getShowingCoupons,
  getCouponById,
  updateCoupon,
  updateCouponStatus,
  deleteCoupon,
  bulkUpdateCoupons,
  bulkDeleteCoupons,
  applyCoupon,
};
