import { Queue } from "bullmq";

import { COUPON_EXPIRY_SWEEP_CRON } from "../modules/notification/notification.constant";
import { TNotifyInput } from "../modules/notification/notification.interface";
import { JOB_ATTEMPTS, JOB_BACKOFF_MS, queueConnection } from "./queue.config";

export const INBOX_QUEUE_NAME = "inbox";

export const INBOX_DELIVER_JOB = "deliver";
export const COUPON_EXPIRY_SWEEP_JOB = "coupon-expiry-sweep";

export type TInboxDeliverJob = TNotifyInput;

export const inboxQueue = new Queue(INBOX_QUEUE_NAME, {
  ...queueConnection,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: JOB_BACKOFF_MS },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const scheduleCouponExpirySweep = async (): Promise<void> => {
  await inboxQueue.upsertJobScheduler(
    COUPON_EXPIRY_SWEEP_JOB,
    { pattern: COUPON_EXPIRY_SWEEP_CRON },
    { name: COUPON_EXPIRY_SWEEP_JOB },
  );
};
