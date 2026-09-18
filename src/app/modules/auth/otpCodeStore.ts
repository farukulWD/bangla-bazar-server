import redisClient from "../../../redis";
import config from "../../config";
import { TOtpRecord } from "./auth.interface";

export const readJson = async <T>(key: string): Promise<T | null> => {
  const raw = await redisClient.get(key);
  if (!raw) {
    return null;
  }
  try {
    return JSON.parse(raw) as T;
  } catch {
    await redisClient.del(key);
    return null;
  }
};

export type TOtpCodeStore = {
  codeKey: (owner: string) => string;
  putCode: (owner: string, codeHash: string) => Promise<void>;
  getCode: (owner: string) => Promise<TOtpRecord | null>;
  codeTtlSeconds: (owner: string) => Promise<number>;
  bumpAttempts: (owner: string, record: TOtpRecord) => Promise<number>;
  burnCode: (owner: string, record: TOtpRecord) => Promise<void>;
  clearCode: (owner: string) => Promise<void>;
};

/** `owner` is only a key suffix — registration keys by phone, password reset by user id. */
export const createOtpCodeStore = (prefix: string): TOtpCodeStore => {
  const codeKey = (owner: string): string => `${prefix}${owner}`;

  return {
    codeKey,

    putCode: async (owner, codeHash) => {
      const record: TOtpRecord = { codeHash, attempts: 0 };
      await redisClient.set(
        codeKey(owner),
        JSON.stringify(record),
        "EX",
        config.otp_code_ttl_seconds,
      );
    },

    getCode: (owner) => readJson<TOtpRecord>(codeKey(owner)),

    /** Seconds left on the live code — 0 when there is none. Also the resend cooldown. */
    codeTtlSeconds: async (owner) => {
      const ttl = await redisClient.ttl(codeKey(owner));
      return ttl > 0 ? ttl : 0;
    },

    bumpAttempts: async (owner, record) => {
      const attempts = record.attempts + 1;
      // KEEPTTL, so a wrong guess never buys the caller a fresh five minutes.
      await redisClient.set(
        codeKey(owner),
        JSON.stringify({ ...record, attempts }),
        "KEEPTTL",
      );
      return attempts;
    },

    /**
     * Kills the code without releasing the cooldown — deleting the key would let a caller who
     * burned their attempts pull a fresh code immediately.
     */
    burnCode: async (owner, record) => {
      await redisClient.set(
        codeKey(owner),
        JSON.stringify({ ...record, codeHash: "", burned: true }),
        "KEEPTTL",
      );
    },

    clearCode: async (owner) => {
      await redisClient.del(codeKey(owner));
    },
  };
};
