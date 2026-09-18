import { BRAND, codeEmail, TCodeEmailParams, TEmailContent } from "./emailTheme";

export const emailChangeEmail = (params: TCodeEmailParams): TEmailContent =>
  codeEmail(params, {
    title: "Confirm your new address",
    glyph: "&#9993;",
    intro: `Someone asked to use this address for a ${BRAND} account.`,
    // The code goes to the *new* address, so accepting it is what proves ownership.
    instruction:
      "Enter the six-digit code below to move your account to this address. Until you do, the old address stays in place.",
    reassurance:
      "If you did not ask for this, ignore this email — the address on the account will not change.",
    subject: `${BRAND} — confirm your new email address`,
  });
