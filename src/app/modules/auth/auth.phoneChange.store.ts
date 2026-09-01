import redisClient from "../../../redis";
import config from "../../config";
import { createOtpCodeStore } from "./otpCodeStore";

const pendingKey = (userId: string): string => `phonechg:pending:${userId}`;

export const codes = createOtpCodeStore("phonechg:code:");

export const {
  putCode,
  getCode,
  codeTtlSeconds,
  bumpAttempts,
  burnCode,
  clearCode,
} = codes;

export const putPendingPhone = async (
  userId: string,
  phone: string,
): Promise<void> => {
  await redisClient.set(
    pendingKey(userId),
    phone,
    "EX",
    config.otp_pending_ttl_seconds,
  );
};

export const getPendingPhone = async (userId: string): Promise<string | null> =>
  redisClient.get(pendingKey(userId));

export const clearPhoneChange = async (userId: string): Promise<void> => {
  await redisClient.del(pendingKey(userId), codes.codeKey(userId));
};
