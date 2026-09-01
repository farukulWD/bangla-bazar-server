import { BRAND, codeEmail, TCodeEmailParams, TEmailContent } from "./emailTheme";

export const registerOtpEmail = (params: TCodeEmailParams): TEmailContent =>
  codeEmail(params, {
    title: "Verify your account",
    glyph: "&#9989;",
    intro: `Finish creating your ${BRAND} account.`,
    instruction:
      "Enter the six-digit code below to confirm this is you. Your account is created once the code is accepted.",
    reassurance:
      "If you did not sign up, ignore this email — no account will be created.",
    subject: `${BRAND} — verification code`,
  });
