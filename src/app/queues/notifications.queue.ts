import { Queue } from "bullmq";
import { TEmailPayload } from "../utils/sendEmail";
import { JOB_ATTEMPTS, JOB_BACKOFF_MS, queueConnection } from "./queue.config";

export const NOTIFICATIONS_QUEUE_NAME = "notifications";

export const EMAIL_JOB = "email";
export const SMS_JOB = "sms";

/**
 * `otpKey` is the full Redis key holding the code this message carries. When every
 * attempt has failed the worker deletes it, so the caller is not held in the resend
 * cooldown for a code that never arrived. Messages that carry no code omit it.
 */
export type TEmailJob = TEmailPayload & { otpKey?: string };
export type TSmsJob = { to: string; message: string; otpKey?: string };

export const notificationsQueue = new Queue(NOTIFICATIONS_QUEUE_NAME, {
  ...queueConnection,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: JOB_BACKOFF_MS },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

export const queueEmail = async (job: TEmailJob): Promise<void> => {
  await notificationsQueue.add(EMAIL_JOB, job);
};

export const queueSms = async (job: TSmsJob): Promise<void> => {
  await notificationsQueue.add(SMS_JOB, job);
};
