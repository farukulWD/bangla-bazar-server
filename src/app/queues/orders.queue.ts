import { Queue } from "bullmq";

import { logger } from "../shared/logger";
import { JOB_ATTEMPTS, JOB_BACKOFF_MS, queueConnection } from "./queue.config";

export const ORDERS_QUEUE_NAME = "orders";

export const ORDER_PLACED_JOB = "order-placed";
export const ORDER_STATUS_JOB = "order-status";
export const LOW_STOCK_JOB = "low-stock";

export type TOrderPlacedJob = { orderId: string };
export type TOrderStatusJob = { orderId: string; status: string };
export type TLowStockJob = { productIds: string[] };

export const ordersQueue = new Queue(ORDERS_QUEUE_NAME, {
  ...queueConnection,
  defaultJobOptions: {
    attempts: JOB_ATTEMPTS,
    backoff: { type: "exponential", delay: JOB_BACKOFF_MS },
    removeOnComplete: 1000,
    removeOnFail: 1000,
  },
});

const ENQUEUE_TIMEOUT_MS = 2000;

const enqueue = async (name: string, job: object): Promise<void> => {
  const added = ordersQueue.add(name, job);

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
      `Could not queue "${name}" (${JSON.stringify(job)}): ${error}`,
    );
  }
};

export const queueOrderPlaced = (job: TOrderPlacedJob): Promise<void> =>
  enqueue(ORDER_PLACED_JOB, job);

export const queueOrderStatus = (job: TOrderStatusJob): Promise<void> =>
  enqueue(ORDER_STATUS_JOB, job);

export const queueLowStock = (job: TLowStockJob): Promise<void> =>
  job.productIds.length > 0 ? enqueue(LOW_STOCK_JOB, job) : Promise.resolve();
