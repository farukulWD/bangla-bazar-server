import { Worker } from "bullmq";
import redisClient from "../../redis";
import { sendEmail } from "../utils/sendEmail";
import { sendSms } from "../utils/sendSms";
import {
  EMAIL_JOB,
  NOTIFICATIONS_QUEUE_NAME,
  SMS_JOB,
  TEmailJob,
  TSmsJob,
} from "./notifications.queue";
import { queueConnection } from "./queue.config";

export const startNotificationsWorker = (): Worker => {
  const worker = new Worker(
    NOTIFICATIONS_QUEUE_NAME,
    async (job) => {
      if (job.name === EMAIL_JOB) {
        const { otpKey: _otpKey, ...payload } = job.data as TEmailJob;
        return sendEmail(payload);
      }
      if (job.name === SMS_JOB) {
        const { to, message } = job.data as TSmsJob;
        return sendSms(to, message);
      }
      return null;
    },
    queueConnection,
  );

  worker.on("failed", async (job, err) => {
    console.error(`Notification job "${job?.name}" failed: ${err.message}`);

    // Only the *last* attempt is final; a retry is still coming before that.
    const attempts = job?.opts?.attempts ?? 1;
    if (!job || job.attemptsMade < attempts) {
      return;
    }

    // The message is never going to arrive, so release the code it carried rather
    // than leaving the caller to wait out a cooldown for nothing.
    const otpKey = (job.data as TEmailJob | TSmsJob)?.otpKey;
    if (otpKey) {
      await redisClient.del(otpKey);
      console.error(`Released ${otpKey}: its code was never delivered.`);
    }
  });

  return worker;
};
