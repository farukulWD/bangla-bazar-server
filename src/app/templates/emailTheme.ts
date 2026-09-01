export type TEmailContent = {
  subject: string;
  html: string;
  text: string;
};

export const BRAND = "Bangla Bazar";

export const TEAL = "#0B7285";
export const TEAL_SOFT = "#D7ECF0";
export const AMBER = "#E8912C";
export const AMBER_SOFT = "#FCEBD4";
export const SAND = "#F4F5F7";
export const CARD = "#FFFFFF";
export const BORDER = "#E3E5E8";
export const CHARCOAL = "#1F2933";
export const SECONDARY = "#52606D";

// Bengali faces stay in the stack even for English copy: an account name may not be English.
export const BODY_FONT =
  "'Hind Siliguri','Noto Sans Bengali','SolaimanLipi','Nirmala UI',Arial,sans-serif";
export const DISPLAY_FONT =
  "'Baloo Da 2','Hind Siliguri','Noto Sans Bengali','Nirmala UI',Arial,sans-serif";
export const FONT_LINK =
  "https://fonts.googleapis.com/css2?family=Hind+Siliguri:wght@400;600;700&family=Baloo+Da+2:wght@600;700;800&display=swap";

export const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

export type TCodeEmailParams = {
  name: string;
  code: string;
  minutes: number;
};

type TCodeEmailCopy = {
  /** Browser tab and heading. */
  title: string;
  /** The emoji in the round badge above the heading. */
  glyph: string;
  /** One line under the heading, saying why this code exists. */
  intro: string;
  /** The sentence above the code telling the reader what to do with it. */
  instruction: string;
  /** What happens if they did not ask for this. */
  reassurance: string;
  subject: string;
};

/**
 * Every code email is the same card with different words — registration, password
 * reset and the address change differ only in `copy`, so the layout lives here once.
 */
export const codeEmail = (
  { name, code, minutes }: TCodeEmailParams,
  copy: TCodeEmailCopy,
): TEmailContent => {
  const trimmedName = name.trim();
  const greeting = trimmedName ? `Hello ${escapeHtml(trimmedName)},` : "Hello,";
  const validity = `This code works for ${minutes} minute${minutes === 1 ? "" : "s"}.`;
  const year = new Date().getFullYear();

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${copy.title}</title>
<link href="${FONT_LINK}" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:${SAND};font-family:${BODY_FONT};">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${SAND};padding:24px 12px;">
<tr><td align="center">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;">

<tr><td style="background-color:${TEAL};padding:18px 24px;border-radius:16px 16px 0 0;">
<span style="font-family:${DISPLAY_FONT};font-weight:800;font-size:19px;color:#FFFFFF;letter-spacing:0.2px;">${BRAND}</span>
</td></tr>
<tr><td style="background-color:${AMBER};height:4px;line-height:4px;font-size:0;">&nbsp;</td></tr>

<tr><td style="background-color:${CARD};border:1px solid ${BORDER};border-top:none;border-radius:0 0 16px 16px;padding:32px 24px;">

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
<tr><td align="center" style="padding-bottom:12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0">
<tr><td width="74" height="74" align="center" valign="middle" style="background-color:${TEAL_SOFT};border-radius:37px;font-size:34px;line-height:74px;">${copy.glyph}</td></tr>
</table>
</td></tr>
<tr><td align="center" style="font-family:${DISPLAY_FONT};font-weight:800;font-size:20px;line-height:30px;color:${CHARCOAL};padding-bottom:6px;">${copy.title}</td></tr>
<tr><td align="center" style="font-size:12.5px;line-height:1.6;color:${SECONDARY};padding-bottom:24px;">${copy.intro}</td></tr>
</table>

<p style="margin:0 0 10px;font-size:13px;line-height:1.7;color:${CHARCOAL};">${greeting}</p>
<p style="margin:0 0 18px;font-size:13px;line-height:1.7;color:${SECONDARY};">${copy.instruction}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
<tr>
<td width="3" style="background-color:${AMBER};font-size:0;line-height:0;">&nbsp;</td>
<td align="center" style="background-color:${AMBER_SOFT};border-radius:0 10px 10px 0;padding:18px 12px;">
<div style="font-family:${DISPLAY_FONT};font-weight:800;font-size:28px;line-height:36px;letter-spacing:8px;color:${CHARCOAL};">${code}</div>
<div style="font-size:11.5px;line-height:1.6;color:${CHARCOAL};padding-top:4px;">${validity}</div>
</td>
</tr>
</table>

<p style="margin:0 0 10px;font-size:12.5px;line-height:1.7;color:${SECONDARY};">${copy.reassurance}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
<tr><td style="border-top:1px solid ${BORDER};padding-top:16px;font-size:11px;line-height:1.7;color:${SECONDARY};">Never share this code. ${BRAND} will never ask you for your code or your password.</td></tr>
</table>

</td></tr>

<tr><td align="center" style="padding:18px 24px 0;font-size:11px;line-height:1.7;color:${SECONDARY};">&copy; ${year} ${BRAND}</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`;

  const text = [
    `${BRAND} — ${copy.title.toLowerCase()}`,
    "",
    trimmedName ? `Hello ${trimmedName},` : "Hello,",
    "",
    copy.intro,
    `Your six-digit code: ${code}`,
    validity,
    "",
    copy.reassurance,
    `Never share this code. ${BRAND} will never ask you for your code or your password.`,
    "",
    `© ${year} ${BRAND}`,
  ].join("\n");

  return { subject: copy.subject, html, text };
};
