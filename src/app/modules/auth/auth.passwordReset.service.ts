import { randomBytes } from "crypto";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { queueEmail, queueSms } from "../../queues/notifications.queue";
import { passwordResetEmail } from "../../templates/passwordResetEmail";
import { resolveIdentifier, toBdE164 } from "../../utils/identifier";
import { generateOtp, hashOtp } from "../../utils/otp";
import { requireEmailRecipient } from "../../utils/sendEmail";
import { requireSmsRecipient } from "../../utils/sendSms";
import { User } from "../users/user.model";
import {
  TPasswordResetChallenge,
  TResetTokenResult,
} from "./auth.interface";
import { maskEmail, maskPhone } from "./auth.mask";
import { assertCodeMatches } from "./auth.otpChallenge";
import * as resetStore from "./auth.passwordReset.store";

const isDevelopment = config.node_environment === "development";

type TResetTarget = {
  userId: string;
  /** Echoed back to the client, and what the next call in the flow carries. */
  identifier: string;
  name: string;
  phoneMasked: string;
} & ({ channel: "sms"; phone: string } | { channel: "email"; email: string });

const resolveTarget = async (rawIdentifier: string): Promise<TResetTarget> => {
  const lookup = resolveIdentifier(rawIdentifier.trim());
  const user = lookup
    ? await User.findOne({ ...lookup, isDeleted: { $ne: true } }).select(
        "name phone email status",
      )
    : null;

  if (!lookup || !user) {
    throw new AppError(
      httpStatus.NOT_FOUND,
      "No account matches that email or phone number",
      "",
      [{ path: "identifier", message: "No matching account" }],
    );
  }
  if (user.status !== "active") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This account has been deactivated",
    );
  }

  // Only a Bangladeshi number is a channel — a foreign one cannot be texted.
  const phone = user.phone ? toBdE164(user.phone) : null;
  const email = user.email?.trim() || null;

  const base = {
    userId: user._id.toString(),
    identifier: "email" in lookup ? lookup.email : lookup.phone,
    name: user.name,
    phoneMasked: phone ? maskPhone(phone) : "",
  };

  // An email typed in full is answered there. A phone falls through to the account's
  // email only when SMS cannot serve it at all.
  if ("email" in lookup && email) {
    return { ...base, channel: "email", email };
  }
  if (phone) {
    return { ...base, channel: "sms", phone };
  }
  if (email) {
    return { ...base, channel: "email", email };
  }

  throw new AppError(
    httpStatus.BAD_REQUEST,
    "This account has no Bangladeshi mobile number or email address on file, so a code cannot be sent. Ask an administrator to add one.",
    "",
    [{ path: "identifier", message: "No contact details on file" }],
  );
};

const issueCode = async (target: TResetTarget): Promise<string> => {
  const to =
    target.channel === "email"
      ? requireEmailRecipient(target.email)
      : requireSmsRecipient(target.phone);

  const code = generateOtp();
  const otpKey = resetStore.codes.codeKey(target.userId);
  await resetStore.putCode(target.userId, hashOtp(code));

  const minutes = Math.round(config.otp_code_ttl_seconds / 60);
  try {
    if (target.channel === "email") {
      await queueEmail({
        to,
        ...passwordResetEmail({ name: target.name, code, minutes }),
        otpKey,
      });
    } else {
      await queueSms({
        to,
        message: `Your Bangla Bazar password reset code is ${code}. Valid for ${minutes} minutes.`,
        otpKey,
      });
    }
  } catch (error) {
    // Never queued, so never delivered — release the code rather than hold the caller
    // in a cooldown for it.
    await resetStore.clearCode(target.userId);
    throw error;
  }
  return code;
};

const challenge = async (
  target: TResetTarget,
  code?: string,
): Promise<TPasswordResetChallenge> => {
  const ttl = await resetStore.codeTtlSeconds(target.userId);
  return {
    identifier: target.identifier,
    channel: target.channel,
    targetMasked:
      target.channel === "email"
        ? maskEmail(target.email)
        : maskPhone(target.phone),
    phoneMasked: target.phoneMasked,
    expiresInSeconds: ttl,
    resendAfterSeconds: ttl,
    ...(isDevelopment && code ? { devCode: code } : {}),
  };
};

const forgot = async (
  rawIdentifier: string,
): Promise<TPasswordResetChallenge> => {
  const target = await resolveTarget(rawIdentifier);

  // A live code is not replaced — that is the cooldown. Resubmitting the form is
  // therefore not an error, it just returns the running clock.
  if ((await resetStore.codeTtlSeconds(target.userId)) > 0) {
    return challenge(target);
  }

  return challenge(target, await issueCode(target));
};

const resendCode = async (
  rawIdentifier: string,
): Promise<TPasswordResetChallenge> => {
  const target = await resolveTarget(rawIdentifier);

  const ttl = await resetStore.codeTtlSeconds(target.userId);
  if (ttl > 0) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `A code has already been sent. Please wait ${ttl} more seconds.`,
      "",
      [{ path: "retryAfterSeconds", message: String(ttl) }],
    );
  }

  return challenge(target, await issueCode(target));
};

const verifyCode = async (
  rawIdentifier: string,
  code: string,
): Promise<TResetTokenResult> => {
  const target = await resolveTarget(rawIdentifier);

  await assertCodeMatches(resetStore.codes, target.userId, code);
  await resetStore.clearCode(target.userId);

  // The code proved who they are; this token is what actually authorises the change,
  // so the new password can be chosen on a second screen without re-sending the code.
  const resetToken = randomBytes(32).toString("hex");
  await resetStore.putResetToken(hashOtp(resetToken), target.userId);

  return {
    resetToken,
    expiresInSeconds: config.password_reset_token_ttl_seconds,
  };
};

const resetPassword = async (
  resetToken: string,
  password: string,
): Promise<null> => {
  const userId = await resetStore.takeResetToken(hashOtp(resetToken));
  if (!userId) {
    throw new AppError(
      httpStatus.GONE,
      "This reset has expired or was already used. Please start again.",
    );
  }

  const user = await User.findById(userId);
  if (!user || user.isDeleted) {
    throw new AppError(httpStatus.UNAUTHORIZED, "This account no longer exists");
  }
  if (user.status !== "active") {
    throw new AppError(
      httpStatus.FORBIDDEN,
      "This account has been deactivated",
    );
  }

  // Plaintext, unlike registration — the pre-save hook hashes it and stamps
  // `passwordChangedAt`, which makes every existing token stale.
  user.password = password;
  await user.save();

  return null;
};

export const PasswordResetServices = {
  forgot,
  resendCode,
  verifyCode,
  resetPassword,
};
