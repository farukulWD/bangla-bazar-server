import z from "zod";
import { isBdPhone } from "../../utils/identifier";
import { OTP_LENGTH } from "../../utils/otp";

const otpCode = z
  .string()
  .trim()
  .regex(
    new RegExp(`^\\d{${OTP_LENGTH}}$`),
    `Enter the ${OTP_LENGTH}-digit code`,
  );

const identifier = z
  .string()
  .trim()
  .min(1, "Enter the email address or mobile number you signed up with");

// Six, matching what the sign-up screen promises.
const password = z.string().min(6, "Password must be at least 6 characters");

const bdPhone = z
  .string()
  .trim()
  .refine(
    isBdPhone,
    "Enter a valid Bangladeshi mobile number, e.g. 01712345678",
  );

const email = z.email("Enter a valid email address");

const registerValidationSchema = z.object({
  body: z
    .object({
      name: z.string().trim().min(2, "Name is required"),
      email: z.union([z.literal(""), email]).optional(),
      phone: z.union([z.literal(""), bdPhone]).optional(),
      password,
    })
    .refine((body) => Boolean(body.email || body.phone), {
      message: "Enter an email address or a mobile number",
      path: ["email"],
    }),
});

const resendOtpValidationSchema = z.object({
  body: z.object({ identifier }),
});

const verifyOtpValidationSchema = z.object({
  body: z.object({ identifier, code: otpCode }),
});

const loginValidationSchema = z.object({
  body: z.object({
    identifier: z.string().trim().min(1, "Enter your email or phone number"),
    password: z.string().min(1, "Password is required"),
  }),
});

const forgotPasswordValidationSchema = z.object({
  body: z.object({ identifier }),
});

const verifyResetValidationSchema = z.object({
  body: z.object({ identifier, code: otpCode }),
});

const resetPasswordValidationSchema = z.object({
  body: z.object({
    resetToken: z
      .string()
      .trim()
      .min(1, "This reset is incomplete. Please start again."),
    password,
  }),
});

const changePasswordValidationSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: password,
  }),
});

const changePhoneValidationSchema = z.object({
  body: z.object({ phone: bdPhone }),
});

const changeEmailValidationSchema = z.object({
  body: z.object({ email }),
});

const verifyCodeValidationSchema = z.object({
  body: z.object({ code: otpCode }),
});

export const authValidation = {
  registerValidationSchema,
  resendOtpValidationSchema,
  verifyOtpValidationSchema,
  loginValidationSchema,
  forgotPasswordValidationSchema,
  verifyResetValidationSchema,
  resetPasswordValidationSchema,
  changePasswordValidationSchema,
  changePhoneValidationSchema,
  changeEmailValidationSchema,
  verifyCodeValidationSchema,
};
