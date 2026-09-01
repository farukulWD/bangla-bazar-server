import { ConnectionOptions } from "bullmq";
import config from "../config";

/**
 * BullMQ opens its own connections rather than borrowing the shared client in
 * `src/redis.ts`: workers require `maxRetriesPerRequest: null`, which that client
 * does not set. The fallback matches redis.ts — `redis_url` defaults to "", which
 * is not a URL.
 */
export const queueConnection: { connection: ConnectionOptions } = {
  connection: { url: config.redis_url || "redis://localhost:6379" },
};

export const JOB_ATTEMPTS = 3;
export const JOB_BACKOFF_MS = 5000;
