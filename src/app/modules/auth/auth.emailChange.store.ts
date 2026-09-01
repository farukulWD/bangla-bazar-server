import redisClient from "../../../redis";
import config from "../../config";
import { createOtpCodeStore } from "./otpCodeStore";

const pendingKey = (userId: string): string => `emailchg:pending:${userId}`;

export const codes = createOtpCodeStore("emailchg:code:");

export const {
  putCode,
  getCode,
  codeTtlSeconds,
  bumpAttempts,
  burnCode,
  clearCode,
} = codes;

export const putPendingEmail = async (
  userId: string,
  email: string,
): Promise<void> => {
  await redisClient.set(
    pendingKey(userId),
    email,
    "EX",
    config.otp_pending_ttl_seconds,
  );
};

export const getPendingEmail = async (userId: string): Promise<string | null> =>
  redisClient.get(pendingKey(userId));

export const clearEmailChange = async (userId: string): Promise<void> => {
  await redisClient.del(pendingKey(userId), codes.codeKey(userId));
};
