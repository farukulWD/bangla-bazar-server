import { INBOX_DELIVER_JOB, inboxQueue } from "../../queues/inbox.queue";
import { logger } from "../../shared/logger";
import { isEventEnabled } from "./notification.catalog";
import { TNotifyInput } from "./notification.interface";

const ENQUEUE_TIMEOUT_MS = 2000;

const enqueue = async (input: TNotifyInput): Promise<void> => {
  const added = inboxQueue.add(INBOX_DELIVER_JOB, input);

  added.catch(() => undefined);

  try {
    await Promise.race([
      added,
      new Promise((_resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error(`timed out after ${ENQUEUE_TIMEOUT_MS}ms`)),
          ENQUEUE_TIMEOUT_MS,
        );

        timer.unref();
      }),
    ]);
  } catch (error) {
    logger.error(
      `Notification "${input.event}" could not be queued: ${
        error instanceof Error ? error.message : String(error)
      }`,
    );
  }
};

export const notify = (input: TNotifyInput): void => {
  if (!isEventEnabled(input.event)) {
    return;
  }

  void enqueue(input);
};
