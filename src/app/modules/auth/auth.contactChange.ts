import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { generateOtp, hashOtp } from "../../utils/otp";
import { TRole } from "../roles/roles.interface";
import { User } from "../users/user.model";
import { TAuthUser, TOtpChallenge, TRegisterChannel, TSessionUser } from "./auth.interface";
import { assertCodeMatches } from "./auth.otpChallenge";
import { TOtpCodeStore } from "./otpCodeStore";
import { toSessionUser } from "./auth.utils";

const isDevelopment = config.node_environment === "development";

export type TContactChangeConfig = {
  /** The user field being changed, and the flag that records it as verified. */
  field: "phone" | "email";
  verifiedFlag: "isPhoneVerify" | "isEmailVerify";
  channel: TRegisterChannel;
  codes: TOtpCodeStore;
  putPending: (userId: string, value: string) => Promise<void>;
  getPending: (userId: string) => Promise<string | null>;
  clearChange: (userId: string) => Promise<void>;
  /** Throws `AppError` when the submitted value is not usable. */
  normalise: (raw: string) => string;
  mask: (value: string) => string;
  /** Sends the code to the *new* value — accepting it is what proves ownership. */
  deliver: (input: {
    to: string;
    name: string;
    code: string;
    minutes: number;
    otpKey: string;
  }) => Promise<void>;
  copy: {
    unchanged: string;
    conflict: string;
    expired: string;
  };
};

/**
 * Phone and email changes differ in what they send and what they write, but not in
 * how the change is held: one pending value per account, one live code, and a
 * cooldown that a second submission cannot shorten. That part lives here once.
 */
export const createContactChangeService = (cfg: TContactChangeConfig) => {
  const assertFree = async (value: string, selfId: string): Promise<void> => {
    const taken = await User.findOne({
      [cfg.field]: value,
      _id: { $ne: selfId },
      isDeleted: { $ne: true },
    }).select("_id");

    if (taken) {
      throw new AppError(httpStatus.CONFLICT, cfg.copy.conflict, "", [
        { path: cfg.field, message: "Already registered" },
      ]);
    }
  };

  const issueCode = async (
    userId: string,
    value: string,
    name: string,
  ): Promise<string> => {
    const code = generateOtp();
    const otpKey = cfg.codes.codeKey(userId);
    await cfg.codes.putCode(userId, hashOtp(code));

    const minutes = Math.round(config.otp_code_ttl_seconds / 60);
    try {
      await cfg.deliver({ to: value, name, code, minutes, otpKey });
    } catch (error) {
      await cfg.codes.clearCode(userId);
      throw error;
    }
    return code;
  };

  const challenge = async (
    userId: string,
    value: string,
    code?: string,
  ): Promise<TOtpChallenge> => {
    const ttl = await cfg.codes.codeTtlSeconds(userId);
    return {
      identifier: value,
      channel: cfg.channel,
      targetMasked: cfg.mask(value),
      expiresInSeconds: ttl,
      resendAfterSeconds: ttl,
      ...(isDevelopment && code ? { devCode: code } : {}),
    };
  };

  const expired = (): AppError =>
    new AppError(httpStatus.GONE, cfg.copy.expired);

  const request = async (
    user: TAuthUser,
    rawValue: string,
  ): Promise<TOtpChallenge> => {
    const userId = user._id.toString();
    const value = cfg.normalise(rawValue);

    if (user[cfg.field] === value) {
      throw new AppError(httpStatus.BAD_REQUEST, cfg.copy.unchanged, "", [
        { path: cfg.field, message: "No change" },
      ]);
    }

    await assertFree(value, userId);

    const ttl = await cfg.codes.codeTtlSeconds(userId);
    if (ttl > 0) {
      const pending = await cfg.getPending(userId);

      // Re-submitting the same value is the cooldown, not an error. A *different*
      // one is refused: the live code went to the pending value and must not come
      // to stand for another.
      if (pending === value) {
        return challenge(userId, value);
      }

      throw new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `A code was already sent to ${pending ? cfg.mask(pending) : "another destination"}. Please wait ${ttl} seconds before changing it.`,
        "",
        [{ path: "retryAfterSeconds", message: String(ttl) }],
      );
    }

    await cfg.putPending(userId, value);
    return challenge(userId, value, await issueCode(userId, value, user.name));
  };

  const resend = async (user: TAuthUser): Promise<TOtpChallenge> => {
    const userId = user._id.toString();
    const value = await cfg.getPending(userId);
    if (!value) {
      throw expired();
    }

    const ttl = await cfg.codes.codeTtlSeconds(userId);
    if (ttl > 0) {
      throw new AppError(
        httpStatus.TOO_MANY_REQUESTS,
        `A code has already been sent. Please wait ${ttl} more seconds.`,
        "",
        [{ path: "retryAfterSeconds", message: String(ttl) }],
      );
    }

    return challenge(userId, value, await issueCode(userId, value, user.name));
  };

  const verify = async (
    user: TAuthUser,
    code: string,
  ): Promise<TSessionUser> => {
    const userId = user._id.toString();
    const value = await cfg.getPending(userId);
    if (!value) {
      throw expired();
    }

    await assertCodeMatches(cfg.codes, userId, code);

    // Re-checked after the wait: it was free when the code went out, and the unique
    // index would answer a race with E11000 rather than this message.
    await assertFree(value, userId);

    const updated = await User.findOneAndUpdate(
      { _id: user._id, isDeleted: { $ne: true } },
      { [cfg.field]: value, [cfg.verifiedFlag]: true },
      { new: true, runValidators: true },
    ).populate<{ role: TRole | null }>("role");

    if (!updated) {
      throw new AppError(
        httpStatus.UNAUTHORIZED,
        "This account no longer exists",
      );
    }

    await cfg.clearChange(userId);

    return toSessionUser(updated as unknown as TAuthUser);
  };

  return { request, resend, verify };
};
