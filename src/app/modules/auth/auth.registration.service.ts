import bcrypt from "bcrypt";
import httpStatus from "http-status";
import config from "../../config";
import AppError from "../../errors/AppError";
import { registerOtpEmail } from "../../templates/registerOtpEmail";
import { toBdE164 } from "../../utils/identifier";
import { generateOtp, hashOtp } from "../../utils/otp";
import { requireEmailRecipient } from "../../utils/sendEmail";
import { requireSmsRecipient } from "../../utils/sendSms";
import { queueEmail, queueSms } from "../../queues/notifications.queue";
import { UserType } from "../users/user.interface";
import { User } from "../users/user.model";
import {
  TOtpChallenge,
  TPendingRegistration,
  TRegisterChannel,
  TRegisterPayload,
  TRegisterResult,
} from "./auth.interface";
import { maskEmail, maskPhone } from "./auth.mask";
import { assertCodeMatches } from "./auth.otpChallenge";
import * as otpStore from "./auth.otpStore";
import { createAccessToken, createRefreshToken, toSessionUser } from "./auth.utils";

const isDevelopment = config.node_environment === "development";

/**
 * One registration, addressed by whichever contact detail the code went to.
 * `identifier` keys both Redis records and is what the client echoes back on
 * resend and verify.
 */
type TRegistrationTarget = {
  identifier: string;
  channel: TRegisterChannel;
  email?: string;
  phone?: string;
};

const normaliseEmail = (raw?: string): string | undefined => {
  const email = raw?.trim().toLowerCase();
  return email || undefined;
};

const normalisePhone = (raw?: string): string | undefined => {
  const trimmed = raw?.trim();
  if (!trimmed) {
    return undefined;
  }
  const phone = toBdE164(trimmed);
  if (!phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Enter a valid Bangladeshi mobile number",
      "",
      [{ path: "phone", message: "Invalid number" }],
    );
  }
  return phone;
};

const buildTarget = (
  email: string | undefined,
  phone: string | undefined,
): TRegistrationTarget => {
  if (!email && !phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Phone or email is required to register",
      "",
      [{ path: "email", message: "Enter an email address or a mobile number" }],
    );
  }

  // Email wins when both are given: it is the cheaper channel and the one the
  // caller most likely watches.
  return email
    ? { identifier: email, channel: "email", email, phone }
    : { identifier: phone as string, channel: "sms", email, phone };
};

const resolveTarget = (payload: TRegisterPayload): TRegistrationTarget =>
  buildTarget(normaliseEmail(payload.email), normalisePhone(payload.phone));

/** Resend and verify carry only the identifier, so the channel is re-derived from it. */
const targetFromIdentifier = (raw: string): TRegistrationTarget => {
  const trimmed = raw.trim();
  return trimmed.includes("@")
    ? buildTarget(normaliseEmail(trimmed), undefined)
    : buildTarget(undefined, normalisePhone(trimmed));
};

const assertIdentifierFree = async (
  email?: string,
  phone?: string,
): Promise<void> => {
  const clauses = [
    ...(email ? [{ email }] : []),
    ...(phone ? [{ phone }] : []),
  ];
  if (clauses.length === 0) {
    return;
  }

  const taken = await User.findOne({
    $or: clauses,
    isDeleted: { $ne: true },
  }).select("phone email");

  if (!taken) {
    return;
  }

  const clashedOnEmail = Boolean(email) && taken.email === email;
  throw new AppError(
    httpStatus.CONFLICT,
    clashedOnEmail
      ? "An account with this email address already exists"
      : "An account with this mobile number already exists",
    "",
    [
      {
        path: clashedOnEmail ? "email" : "phone",
        message: "Already registered",
      },
    ],
  );
};

const issueCode = async (
  target: TRegistrationTarget,
  name: string,
): Promise<string> => {
  // Validated here, while there is still a request to fail: a bad address discovered
  // inside the worker would only ever be a log line.
  const to =
    target.channel === "email"
      ? requireEmailRecipient(target.email as string)
      : requireSmsRecipient(target.phone as string);

  const code = generateOtp();
  const otpKey = otpStore.codes.codeKey(target.identifier);
  await otpStore.putCode(target.identifier, hashOtp(code));

  const minutes = Math.round(config.otp_code_ttl_seconds / 60);
  try {
    if (target.channel === "email") {
      await queueEmail({
        to,
        ...registerOtpEmail({ name, code, minutes }),
        otpKey,
      });
    } else {
      await queueSms({
        to,
        message: `Your Bangla Bazar verification code is ${code}. Valid for ${minutes} minutes.`,
        otpKey,
      });
    }
  } catch (error) {
    // The job never made it onto the queue, so nothing will ever deliver this code —
    // clearing it keeps the caller out of a cooldown they cannot escape. A job that
    // is queued but fails every attempt is released by the worker instead.
    await otpStore.clearCode(target.identifier);
    throw error;
  }
  return code;
};

const challenge = async (
  target: TRegistrationTarget,
  code?: string,
): Promise<TOtpChallenge> => {
  const ttl = await otpStore.codeTtlSeconds(target.identifier);
  return {
    identifier: target.identifier,
    channel: target.channel,
    targetMasked:
      target.channel === "email"
        ? maskEmail(target.email as string)
        : maskPhone(target.phone as string),
    expiresInSeconds: ttl,
    resendAfterSeconds: ttl,
    ...(isDevelopment && code ? { devCode: code } : {}),
  };
};

const expiredRegistration = (): AppError =>
  new AppError(
    httpStatus.GONE,
    "This registration has expired. Please sign up again.",
  );

const register = async (payload: TRegisterPayload): Promise<TOtpChallenge> => {
  if (!payload.name?.trim()) {
    throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
  }
  if (!payload.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Password is required");
  }

  const target = resolveTarget(payload);
  await assertIdentifierFree(target.email, target.phone);

  const pending: TPendingRegistration = {
    name: payload.name.trim(),
    email: target.email,
    phone: target.phone,
    passwordHash: await bcrypt.hash(
      payload.password,
      Number(config.bcrypt_salt_rounds),
    ),
  };
  await otpStore.putPending(target.identifier, pending);

  // A live code is not replaced — that is the cooldown. The details above are still
  // updated, so a caller who resubmits with a corrected name gets the corrected one
  // when they verify.
  if ((await otpStore.codeTtlSeconds(target.identifier)) > 0) {
    return challenge(target);
  }

  return challenge(target, await issueCode(target, pending.name));
};

const resendCode = async (rawIdentifier: string): Promise<TOtpChallenge> => {
  const target = targetFromIdentifier(rawIdentifier);
  const pending = await otpStore.getPending(target.identifier);
  if (!pending) {
    throw expiredRegistration();
  }

  const ttl = await otpStore.codeTtlSeconds(target.identifier);
  if (ttl > 0) {
    throw new AppError(
      httpStatus.TOO_MANY_REQUESTS,
      `A code has already been sent. Please wait ${ttl} more seconds.`,
      "",
      [{ path: "retryAfterSeconds", message: String(ttl) }],
    );
  }

  return challenge(target, await issueCode(target, pending.name));
};

const verifyAndCreate = async (
  rawIdentifier: string,
  code: string,
): Promise<TRegisterResult> => {
  const target = targetFromIdentifier(rawIdentifier);
  const pending = await otpStore.getPending(target.identifier);
  if (!pending) {
    throw expiredRegistration();
  }

  await assertCodeMatches(otpStore.codes, target.identifier, code);

  // Re-checked after the wait: both details were free when the code went out, and
  // the unique index would answer a race with E11000 rather than this message.
  await assertIdentifierFree(pending.email, pending.phone);

  const user = new User({
    name: pending.name,
    email: pending.email,
    phone: pending.phone,
    userType: UserType.Customer,
    status: "active",
    isEmailVerify: target.channel === "email",
    isPhoneVerify: target.channel === "sms",
  });
  user.password = pending.passwordHash;
  // Already hashed, at register time — see user.model.ts.
  user.$locals.skipPasswordHash = true;
  await user.save();

  await otpStore.clearRegistration(target.identifier);

  // No read-back: a new account always has `role: null`, and populating it would
  // need the Role model registered on this import path just to return nothing.
  const jwtPayload = { userId: user._id.toString(), userType: user.userType };
  return {
    token: createAccessToken(jwtPayload),
    refreshToken: createRefreshToken(jwtPayload),
    user: toSessionUser({
      _id: user._id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      image: user.image,
      userType: user.userType,
      status: user.status,
      isEmailVerify: user.isEmailVerify,
      isPhoneVerify: user.isPhoneVerify,
      role: null,
    }),
  };
};

export const RegistrationServices = {
  register,
  resendCode,
  verifyAndCreate,
};
