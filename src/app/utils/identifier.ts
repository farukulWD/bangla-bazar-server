import { parsePhoneNumberFromString } from "libphonenumber-js";

export const isEmailIdentifier = (identifier: string): boolean => identifier.includes("@");

export const toE164 = (raw: string): string | null => {
  const parsed = parsePhoneNumberFromString(raw.trim());
  return parsed?.isValid() ? parsed.number : null;
};
export const isValidPhone = (raw: string): boolean => toE164(raw) !== null;

/**
 * E.164 for a Bangladeshi mobile, accepting the local forms a farmer types — `01712345678`,
 * `880…`, `+880…`. `toE164` above cannot: with no default country it only parses `+`-prefixed
 * input, so registration and SMS both go through here.
 */
export const toBdE164 = (raw: string): string | null => {
  const cleaned = raw.trim().replace(/[\s-]/g, "");
  const candidate = /^880\d{10}$/.test(cleaned) ? `+${cleaned}` : cleaned;
  const parsed = parsePhoneNumberFromString(candidate, "BD");
  return parsed?.isValid() && parsed.country === "BD" ? parsed.number : null;
};
export const isBdPhone = (raw: string): boolean => toBdE164(raw) !== null;
export const resolveIdentifier = (
  identifier: string,
): { email: string } | { phone: string } | null => {
  const trimmed = identifier.trim();
  if (isEmailIdentifier(trimmed)) {
    return { email: trimmed.toLowerCase() };
  }
  // `toE164` first, so a non-Bangladeshi staff number still resolves; then the local forms a
  // farmer types — `01712345678`, `880…` — which have no `+` for `toE164` to parse.
  const phone = toE164(trimmed) ?? toBdE164(trimmed);
  return phone ? { phone } : null;
};
