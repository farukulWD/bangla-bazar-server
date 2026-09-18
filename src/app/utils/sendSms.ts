import httpStatus from "http-status";
import AppError from "../errors/AppError";
import { toBdE164 } from "./identifier";

export type TSmsSendResult = {
  id: string | null;
  skipped: boolean;
};

/** Exported for the same reason as `requireEmailRecipient` — validate before enqueueing. */
export const requireSmsRecipient = (raw: string): string => {
  const phone = toBdE164(raw);
  if (!phone) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `"${raw}" is not a valid Bangladeshi mobile number`,
    );
  }
  return phone;
};

/**
 * No provider is wired yet — the code is logged so registration works without
 * credentials. Swapping in Twilio (already a dependency) means replacing the
 * body below; the contract callers rely on stays the same.
 */
export const sendSms = async (
  phone: string,
  message: string,
): Promise<TSmsSendResult> => {
  const to = requireSmsRecipient(phone);
  const body = message.trim();
  if (!body) {
    throw new AppError(httpStatus.BAD_REQUEST, "The SMS message is empty");
  }

  console.log(`SMS to ${to}: ${body}`);
  return { id: null, skipped: true };
};
