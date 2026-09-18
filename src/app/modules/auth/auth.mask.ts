/**
 * Enough to recognise, not enough to use. Shared by registration, password reset and
 * both contact-change flows — every one of them tells the caller where a code went
 * without repeating the address back at whoever asked.
 */

/** `+8801712345678` → `+8801•••••78`. */
export const maskPhone = (phone: string): string => {
  const head = phone.slice(0, 5);
  const tail = phone.slice(-2);
  const hidden = Math.max(phone.length - head.length - tail.length, 1);
  return `${head}${"•".repeat(hidden)}${tail}`;
};

/** `customer@example.com` → `c••••••e@example.com`. */
export const maskEmail = (email: string): string => {
  const at = email.lastIndexOf("@");
  if (at <= 0) {
    return email;
  }
  const local = email.slice(0, at);
  const domain = email.slice(at);
  if (local.length <= 2) {
    return `${local.slice(0, 1)}${"•".repeat(Math.max(local.length - 1, 1))}${domain}`;
  }
  return `${local.slice(0, 1)}${"•".repeat(local.length - 2)}${local.slice(-1)}${domain}`;
};
