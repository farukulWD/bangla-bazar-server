import httpStatus from "http-status";
import AppError from "../../errors/AppError";
import { queueSms } from "../../queues/notifications.queue";
import { toBdE164 } from "../../utils/identifier";
import { requireSmsRecipient } from "../../utils/sendSms";
import { createContactChangeService } from "./auth.contactChange";
import { maskPhone } from "./auth.mask";
import * as phoneStore from "./auth.phoneChange.store";

const requireBdPhone = (raw: string): string => {
  const phone = toBdE164(raw);
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

const service = createContactChangeService({
  field: "phone",
  verifiedFlag: "isPhoneVerify",
  channel: "sms",
  codes: phoneStore.codes,
  putPending: phoneStore.putPendingPhone,
  getPending: phoneStore.getPendingPhone,
  clearChange: phoneStore.clearPhoneChange,
  normalise: requireBdPhone,
  mask: maskPhone,
  deliver: async ({ to, code, minutes, otpKey }) => {
    await queueSms({
      to: requireSmsRecipient(to),
      message: `Your Bangla Bazar number change code is ${code}. Valid for ${minutes} minutes.`,
      otpKey,
    });
  },
  copy: {
    unchanged: "That is already the number on this account",
    conflict: "An account with this mobile number already exists",
    expired: "This number change has expired. Please start again.",
  },
});

export const PhoneChangeServices = {
  requestPhoneChange: service.request,
  resendPhoneChangeCode: service.resend,
  verifyPhoneChange: service.verify,
};
