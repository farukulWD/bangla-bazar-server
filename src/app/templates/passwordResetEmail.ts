import { BRAND, codeEmail, TCodeEmailParams, TEmailContent } from "./emailTheme";

export const passwordResetEmail = (params: TCodeEmailParams): TEmailContent =>
  codeEmail(params, {
    title: "Reset your password",
    glyph: "&#128273;",
    intro: `We received a request to reset your ${BRAND} password.`,
    instruction:
      "Enter the six-digit code below to continue. You can then choose a new password.",
    reassurance:
      "If you did not ask for this, ignore this email — your password will stay as it is. Changing your password signs you out everywhere else.",
    subject: `${BRAND} — password reset code`,
  });
