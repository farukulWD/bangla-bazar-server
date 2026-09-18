import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { queueEmail } from "../../queues/notifications.queue";
import { emailChangeEmail } from "../../templates/emailChangeEmail";
import { requireEmailRecipient } from "../../utils/sendEmail";
import { createContactChangeService } from "./auth.contactChange";
import * as emailStore from "./auth.emailChange.store";
import { maskEmail } from "./auth.mask";

const requireEmail = (raw: string): string => {
  const email = raw.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "Enter a valid email address",
      "",
      [{ path: "email", message: "Invalid address" }],
    );
  }
  return email;
};

const service = createContactChangeService({
  field: "email",
  verifiedFlag: "isEmailVerify",
  channel: "email",
  codes: emailStore.codes,
  putPending: emailStore.putPendingEmail,
  getPending: emailStore.getPendingEmail,
  clearChange: emailStore.clearEmailChange,
  normalise: requireEmail,
  mask: maskEmail,
  deliver: async ({ to, name, code, minutes, otpKey }) => {
    await queueEmail({
      to: requireEmailRecipient(to),
      ...emailChangeEmail({ name, code, minutes }),
      otpKey,
    });
  },
  copy: {
    unchanged: "That is already the address on this account",
    conflict: "An account with this email address already exists",
    expired: "This address change has expired. Please start again.",
  },
});

export const EmailChangeServices = {
  requestEmailChange: service.request,
  resendEmailChangeCode: service.resend,
  verifyEmailChange: service.verify,
};
