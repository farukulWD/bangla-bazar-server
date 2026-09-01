import { createHash, randomInt, timingSafeEqual } from "crypto";

export const OTP_LENGTH = 6;

export const generateOtp = (): string =>
  randomInt(0, 10 ** OTP_LENGTH)
    .toString()
    .padStart(OTP_LENGTH, "0");

export const hashOtp = (code: string): string =>
  createHash("sha256").update(code).digest("hex");

export const isOtpMatch = (code: string, codeHash: string): boolean => {
  const candidate = Buffer.from(hashOtp(code), "hex");
  const expected = Buffer.from(codeHash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
};
