import redisClient from "../../../redis";
import config from "../../config";
import { createOtpCodeStore } from "./otpCodeStore";

const tokenKey = (tokenHash: string): string => `reset:token:${tokenHash}`;

/** Keyed by userId: the code belongs to the account, not to how the identifier was spelt. */
export const codes = createOtpCodeStore("reset:code:");

export const {
  putCode,
  getCode,
  codeTtlSeconds,
  bumpAttempts,
  burnCode,
  clearCode,
} = codes;

export const putResetToken = async (
  tokenHash: string,
  userId: string,
): Promise<void> => {
  await redisClient.set(
    tokenKey(tokenHash),
    userId,
    "EX",
    config.password_reset_token_ttl_seconds,
  );
};

/** Single use: the token is spent by reading it, so a replay finds nothing. */
export const takeResetToken = async (
  tokenHash: string,
): Promise<string | null> => redisClient.getdel(tokenKey(tokenHash));
