import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { isOtpMatch } from "../../utils/otp";
import { TOtpCodeStore } from "./otpCodeStore";

/**
 * Refusing without releasing the cooldown: the key outlives the dead code, so the
 * seconds quoted here are the wait before a fresh one can be asked for.
 */
export const tooManyWrongCodes = async (
  store: TOtpCodeStore,
  owner: string,
): Promise<AppError> => {
  const ttl = await store.codeTtlSeconds(owner);
  return new AppError(
    httpStatus.TOO_MANY_REQUESTS,
    `Too many wrong codes. Please request a new one in ${ttl} seconds.`,
    "",
    [{ path: "retryAfterSeconds", message: String(ttl) }],
  );
};

/**
 * Spends one attempt against the live code and throws what the caller should
 * surface: gone, burned, or wrong with the attempts left named.
 */
export const assertCodeMatches = async (
  store: TOtpCodeStore,
  owner: string,
  code: string,
): Promise<void> => {
  const record = await store.getCode(owner);

  if (!record) {
    throw new AppError(
      httpStatus.GONE,
      "This code has expired. Please request a new one.",
    );
  }
  if (record.burned) {
    throw await tooManyWrongCodes(store, owner);
  }

  if (isOtpMatch(code, record.codeHash)) {
    return;
  }

  const attempts = await store.bumpAttempts(owner, record);
  const left = config.otp_max_attempts - attempts;

  if (left <= 0) {
    await store.burnCode(owner, record);
    throw await tooManyWrongCodes(store, owner);
  }

  throw new AppError(
    httpStatus.BAD_REQUEST,
    `That code is not correct. ${left} attempt${left === 1 ? "" : "s"} left.`,
    "",
    [{ path: "code", message: "Incorrect code" }],
  );
};
