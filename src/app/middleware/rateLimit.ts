import { NextFunction, Request, RequestHandler, Response } from "express";
import rateLimit from "express-rate-limit";
import httpStatus from "http-status";
import { RedisStore } from "rate-limit-redis";
import redisClient from "../../redis";
import AppError from "../errors/AppError";

const tooManyRequests =
  (message: string) => (_req: Request, _res: Response, next: NextFunction) =>
    next(new AppError(httpStatus.TOO_MANY_REQUESTS, message));

const redisStore = (prefix: string) =>
  new RedisStore({
    prefix,
    sendCommand: (...args: string[]) =>
      redisClient.call(...(args as [string, ...string[]])) as Promise<string>,
  });

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
  /** What to count by. Returning undefined falls back to the caller's IP. */
  key?: (req: Request) => string | undefined;
};

/**
 * For unauthenticated routes that cost money — sending codes above all. `userRateLimit`
 * cannot serve them: it keys on `req.user`, which is exactly what these routes lack.
 */
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
    // Falls back to what v7 keys on by default. (v8 adds `ipKeyGenerator` for IPv6
    // subnet grouping, but v8 also drops `max`, which the legacy server still passes.)
    keyGenerator: (req) => key?.(req) || req.ip || "unknown",
    handler: tooManyRequests(message),
  });

type TUserRateLimitOptions = Omit<TPublicRateLimitOptions, "key">;

/** Keyed on the account, so cycling candidate values cannot shake the limit off. */
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
