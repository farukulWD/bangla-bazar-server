import { TMoneyFormat, formatMoney } from "../utils/money";
import {
  AMBER,
  BODY_FONT,
  BORDER,
  BRAND,
  CARD,
  CHARCOAL,
  DISPLAY_FONT,
  FONT_LINK,
  SAND,
  SECONDARY,
  TEAL,
  TEAL_SOFT,
  TEmailContent,
  escapeHtml,
} from "./emailTheme";

export type TOrderEmailLine = {
  title: string;
  options: { attribute: string; value: string }[];
  qty: number;
  lineTotal: number;
};

export type TOrderEmailParams = {
  name: string;
  invoice: number;
  items: TOrderEmailLine[];
  subtotal: number;
  shippingCost: number;
  discount: number;
  couponCode?: string;
  total: number;

  currency?: TMoneyFormat;
};

export type TOrderEmailCopy = {
  title: string;
  glyph: string;
  intro: string;
  /** Shown above the items; the one line that says what actually happened. */
  message: string;
  subject: string;
};

const optionsLabel = (line: TOrderEmailLine): string =>
  line.options
    .map((option) => `${option.attribute}: ${option.value}`)
    .join(", ");

const totalsRow = (label: string, value: string, strong = false): string =>
  `<tr>
<td style="padding:4px 0;font-size:12.5px;line-height:1.7;color:${strong ? CHARCOAL : SECONDARY};${strong ? "font-weight:700;" : ""}">${label}</td>
<td align="right" style="padding:4px 0;font-size:12.5px;line-height:1.7;color:${strong ? CHARCOAL : SECONDARY};${strong ? "font-weight:700;" : ""}">${value}</td>
</tr>`;

export const orderEmail = (
  params: TOrderEmailParams,
  copy: TOrderEmailCopy,
): TEmailContent => {
  const money = (amount: number): string =>
    formatMoney(amount, params.currency);

  const trimmedName = params.name.trim();
  const greeting = trimmedName ? `Hello ${escapeHtml(trimmedName)},` : "Hello,";
  const year = new Date().getFullYear();

  const itemRows = params.items
    .map((line) => {
      const options = optionsLabel(line);

      return `<tr>
<td style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:12.5px;line-height:1.6;color:${CHARCOAL};">
${escapeHtml(line.title)}${options ? `<div style="font-size:11.5px;color:${SECONDARY};padding-top:2px;">${escapeHtml(options)}</div>` : ""}
<div style="font-size:11.5px;color:${SECONDARY};padding-top:2px;">Quantity: ${line.qty}</div>
</td>
<td align="right" valign="top" style="padding:10px 0;border-bottom:1px solid ${BORDER};font-size:12.5px;line-height:1.6;color:${CHARCOAL};white-space:nowrap;">${money(line.lineTotal)}</td>
</tr>`;
    })
    .join("");

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
<p style="margin:0 0 18px;font-size:13px;line-height:1.7;color:${SECONDARY};">${copy.message}</p>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:18px;">
<tr><td style="background-color:${TEAL_SOFT};border-radius:10px;padding:12px 16px;font-size:12.5px;line-height:1.6;color:${CHARCOAL};">Invoice <strong>#${params.invoice}</strong></td></tr>
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
${itemRows}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:14px;">
${totalsRow("Subtotal", money(params.subtotal))}
${totalsRow("Delivery", params.shippingCost === 0 ? "Free" : money(params.shippingCost))}
${params.discount > 0 ? totalsRow(params.couponCode ? `Discount (${escapeHtml(params.couponCode)})` : "Discount", `- ${money(params.discount)}`) : ""}
${totalsRow("Total", money(params.total), true)}
</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-top:24px;">
<tr><td style="border-top:1px solid ${BORDER};padding-top:16px;font-size:11px;line-height:1.7;color:${SECONDARY};">Questions about this order? Reply to this email and quote invoice #${params.invoice}.</td></tr>
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
    copy.message,
    `Invoice #${params.invoice}`,
    "",
    ...params.items.map((line) => {
      const options = optionsLabel(line);
      return `${line.title}${options ? ` (${options})` : ""} x${line.qty} — ${money(line.lineTotal)}`;
    }),
    "",
    `Subtotal: ${money(params.subtotal)}`,
    `Delivery: ${params.shippingCost === 0 ? "Free" : money(params.shippingCost)}`,
    ...(params.discount > 0
      ? [
          `Discount${params.couponCode ? ` (${params.couponCode})` : ""}: -${money(params.discount)}`,
        ]
      : []),
    `Total: ${money(params.total)}`,
    "",
    `© ${year} ${BRAND}`,
  ].join("\n");

  return { subject: copy.subject, html, text };
};

export const orderPlacedEmail = (params: TOrderEmailParams): TEmailContent =>
  orderEmail(params, {
    title: "Order confirmed",
    glyph: "&#128230;",
    intro: `Thank you for shopping with ${BRAND}.`,
    message:
      "We have received your order and are getting it ready. You will hear from us again when it ships.",
    subject: `${BRAND} — order #${params.invoice} confirmed`,
  });

const STATUS_COPY: Record<string, TOrderEmailCopy> = {
  processing: {
    title: "Order being prepared",
    glyph: "&#128230;",
    intro: `Your ${BRAND} order is moving.`,
    message: "We are packing your order now. It will be on its way shortly.",
    subject: `${BRAND} — order is being prepared`,
  },
  shipped: {
    title: "Order on its way",
    glyph: "&#128666;",
    intro: `Your ${BRAND} order has left us.`,
    message:
      "Your order is with our delivery partner. Please keep your phone nearby so they can reach you.",
    subject: `${BRAND} — order is on its way`,
  },
  delivered: {
    title: "Order delivered",
    glyph: "&#9989;",
    intro: `Your ${BRAND} order has arrived.`,
    message: "This order is marked as delivered. We hope you like it.",
    subject: `${BRAND} — order delivered`,
  },
  cancelled: {
    title: "Order cancelled",
    glyph: "&#10060;",
    intro: `Your ${BRAND} order has been cancelled.`,
    message:
      "This order has been cancelled and nothing will be delivered. If you did not expect this, reply to this email and we will look into it.",
    subject: `${BRAND} — order cancelled`,
  },
};

/** Returns null for a status the customer does not need an email about. */
export const orderStatusEmail = (
  status: string,
  params: TOrderEmailParams,
): TEmailContent | null => {
  const copy = STATUS_COPY[status];

  if (!copy) {
    return null;
  }

  return orderEmail(params, {
    ...copy,
    subject: `${copy.subject} (#${params.invoice})`,
  });
};
