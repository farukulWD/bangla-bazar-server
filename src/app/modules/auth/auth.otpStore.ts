import redisClient from "../../../redis";
import config from "../../config";
import { TPendingRegistration } from "./auth.interface";
import { createOtpCodeStore, readJson } from "./otpCodeStore";

const pendingKey = (phone: string): string => `reg:pending:${phone}`;

/** Exported whole for `assertCodeMatches`, which needs the store, not the loose functions. */
export const codes = createOtpCodeStore("reg:code:");

export const {
  putCode,
  getCode,
  codeTtlSeconds,
  bumpAttempts,
  burnCode,
  clearCode,
} = codes;

export const putPending = async (
  key: string,
  pending: TPendingRegistration,
): Promise<void> => {
  await redisClient.set(
    pendingKey(key),
    JSON.stringify(pending),
    "EX",
    config.otp_pending_ttl_seconds,
  );
};

export const getPending = async (
  key: string,
): Promise<TPendingRegistration | null> =>
  readJson<TPendingRegistration>(pendingKey(key));

export const clearRegistration = async (key: string): Promise<void> => {
  await redisClient.del(pendingKey(key), codes.codeKey(key));
};
