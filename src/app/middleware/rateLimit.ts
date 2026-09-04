import { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit, {
  ClientRateLimitInfo,
  IncrementResponse,
  MemoryStore,
  Options,
  Store,
} from "express-rate-limit";
import httpStatus from "http-status";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../../redis";
import AppError from "../errors/AppError";
import { logger } from "../shared/logger";

const tooManyRequests =
  (message: string) => (_req: Request, _res: Response, next: NextFunction) =>
    next(new AppError(httpStatus.TOO_MANY_REQUESTS, message));

/** A limiter must never be the slowest thing in a request. */
const STORE_TIMEOUT_MS = 1000;

/** How long to stay on memory before trying Redis again, so a dead server is not
 *  re-dialled on every single request. */
const STORE_RETRY_AFTER_MS = 30_000;

const withTimeout = async <T>(work: Promise<T> | T): Promise<T> => {
  // ioredis queues commands while it is disconnected instead of rejecting them, so
  // a call against a dead server never settles on its own.
  const pending = Promise.resolve(work);
  pending.catch(() => undefined);

  return Promise.race([
    pending,
    new Promise<never>((_resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`store timed out after ${STORE_TIMEOUT_MS}ms`)),
        STORE_TIMEOUT_MS,
      );
      timer.unref();
    }),
  ]);
};

class ResilientStore implements Store {
  private readonly redis: RedisStore;
  private readonly memory = new MemoryStore();
  private degradedUntil = 0;

  constructor(prefix: string) {
    this.redis = new RedisStore({
      prefix,
      sendCommand: (...args: string[]) =>
        redisClient.call(...(args as [string, ...string[]])) as Promise<string>,
    });
  }

  init(options: Options): void {
    this.redis.init?.(options);
    this.memory.init?.(options);
  }

  private degrade(operation: string, error: unknown): void {
    if (this.degradedUntil <= Date.now()) {
      logger.error(
        `Rate limiter falling back to in-memory counts for ${STORE_RETRY_AFTER_MS / 1000}s ` +
          `(${operation} failed: ${error}). Limits now apply per process, not cluster-wide.`,
      );
    }

    this.degradedUntil = Date.now() + STORE_RETRY_AFTER_MS;
  }

  private async run<T>(
    operation: string,
    viaRedis: () => Promise<T> | T,
    viaMemory: () => Promise<T> | T,
  ): Promise<T> {
    if (Date.now() < this.degradedUntil) {
      return viaMemory();
    }

    try {
      return await withTimeout(viaRedis());
    } catch (error) {
      this.degrade(operation, error);
      return viaMemory();
    }
  }

  increment(key: string): Promise<IncrementResponse> {
    return this.run(
      "increment",
      () => this.redis.increment(key),
      () => this.memory.increment(key),
    );
  }

  decrement(key: string): Promise<void> {
    return this.run(
      "decrement",
      () => this.redis.decrement(key),
      () => this.memory.decrement(key),
    );
  }

  resetKey(key: string): Promise<void> {
    return this.run(
      "resetKey",
      () => this.redis.resetKey(key),
      () => this.memory.resetKey(key),
    );
  }

  get(key: string): Promise<ClientRateLimitInfo | undefined> {
    return this.run(
      "get",
      () => this.redis.get?.(key),
      () => this.memory.get?.(key),
    );
  }
}

const redisStore = (prefix: string) => new ResilientStore(prefix);

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 1000,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  handler: tooManyRequests("Too many requests. Please try again shortly."),
});

type TPublicRateLimitOptions = {
  windowMs: number;
  limit: number;
  message: string;
  prefix: string;

  key?: (req: Request) => string | undefined;
};

export const publicRateLimit = ({
  windowMs,
  limit,
  message,
  prefix,
  key,
}: TPublicRateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: redisStore(prefix),
    keyGenerator: (req) => key?.(req) || req.ip || "unknown",
    handler: tooManyRequests(message),
  });

type TUserRateLimitOptions = Omit<TPublicRateLimitOptions, "key">;

export const userRateLimit = ({
  windowMs,
  limit,
  message,
  prefix,
}: TUserRateLimitOptions): RequestHandler =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    store: redisStore(prefix),
    keyGenerator: (req) => {
      if (!req.user) {
        throw new AppError(
          httpStatus.INTERNAL_SERVER_ERROR,
          "userRateLimit was used without checkAuth in front of it",
        );
      }
      return req.user._id.toString();
    },
    handler: tooManyRequests(message),
  });
