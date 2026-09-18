import { Worker } from "bullmq";

import { TCoupon } from "../modules/coupon/coupon.interface";
import { Coupon } from "../modules/coupon/coupon.model";
import { COUPON_EXPIRY_WARNING_DAYS } from "../modules/notification/notification.constant";
import { notify } from "../modules/notification/notification.emit";
import { TNotifyInput } from "../modules/notification/notification.interface";
import { notificationServices } from "../modules/notification/notification.services";
import { logger } from "../shared/logger";
import {
  COUPON_EXPIRY_SWEEP_JOB,
  INBOX_DELIVER_JOB,
  INBOX_QUEUE_NAME,
} from "./inbox.queue";
import { queueConnection } from "./queue.config";

type TExpiringCoupon = Pick<TCoupon, "couponCode" | "endTime"> & {
  _id: { toString: () => string };
};

const runCouponExpirySweep = async () => {
  const now = new Date();
  const until = new Date(
    now.getTime() + COUPON_EXPIRY_WARNING_DAYS * 24 * 60 * 60 * 1000,
  );

  const coupons = await Coupon.find({
    status: "show",
    isDeleted: false,
    endTime: { $gte: now, $lte: until },
  })
    .select("couponCode endTime")
    .lean<TExpiringCoupon[]>();

  for (const coupon of coupons) {
    notify({
      event: "coupon.expiring",
      couponId: coupon._id.toString(),
      couponCode: coupon.couponCode,
      endTime: coupon.endTime.toISOString(),
    });
  }

  return { expiring: coupons.length };
};

export const startInboxWorker = (): Worker => {
  const worker = new Worker(
    INBOX_QUEUE_NAME,
    async (job) => {
      switch (job.name) {
        case INBOX_DELIVER_JOB:
          return notificationServices.deliver(job.data as TNotifyInput);
        case COUPON_EXPIRY_SWEEP_JOB:
          return runCouponExpirySweep();
        default:
          return null;
      }
    },
    queueConnection,
  );

  worker.on("failed", (job, err) => {
    logger.error(
      `Inbox job "${job?.data?.event ?? job?.name}" failed: ${err.message}`,
    );
  });

  return worker;
};
