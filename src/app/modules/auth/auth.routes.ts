import { Router } from "express";
import checkAuth from "../../middleware/checkAuth";
import { publicRateLimit, userRateLimit } from "../../middleware/rateLimit";
import validateRequest from "../../middleware/validateRequest";
import { authController } from "./auth.controller";
import { authValidation } from "./auth.validation";

const router = Router();

const HOUR = 60 * 60 * 1000;
const QUARTER_HOUR = 15 * 60 * 1000;

const TOO_MANY_CODES =
  "Too many verification codes requested. Please try again later.";
const TOO_MANY_ATTEMPTS =
  "Too many verification attempts. Please try again later.";

/**
 * The ceiling above the five-minute cooldown, for the caller who cycles identifiers
 * instead of retrying one. Keyed on the identifier where there is one, so a shared
 * mobile network is not a single bucket.
 */
const bodyIdentifier = (value: unknown): string | undefined =>
  typeof value === "string" ? value.trim().toLowerCase() : undefined;

const otpSendLimiter = publicRateLimit({
  windowMs: HOUR,
  limit: 6,
  message: TOO_MANY_CODES,
  prefix: "rl:otp:send:",
  key: (req) =>
    bodyIdentifier(req.body?.identifier) ??
    bodyIdentifier(req.body?.email) ??
    bodyIdentifier(req.body?.phone),
});

const otpVerifyLimiter = publicRateLimit({
  windowMs: QUARTER_HOUR,
  limit: 30,
  message: TOO_MANY_ATTEMPTS,
  prefix: "rl:otp:verify:",
});

const resetSendLimiter = publicRateLimit({
  windowMs: HOUR,
  limit: 10,
  message: "Too many password reset codes requested. Please try again later.",
  prefix: "rl:pwreset:send:",
  key: (req) => bodyIdentifier(req.body?.identifier),
});

const resetVerifyLimiter = publicRateLimit({
  windowMs: QUARTER_HOUR,
  limit: 30,
  message: "Too many password reset attempts. Please try again later.",
  prefix: "rl:pwreset:verify:",
});

const loginLimiter = publicRateLimit({
  windowMs: QUARTER_HOUR,
  limit: 20,
  message: "Too many login attempts. Please try again later.",
  prefix: "rl:login:",
  key: (req) => bodyIdentifier(req.body?.identifier),
});

/**
 * Changing your own contact details is keyed on the account rather than a body field:
 * the caller is authenticated here, so the limiter has an identity that cycling
 * candidate values cannot shake off.
 */
const changeSendLimiter = (prefix: string) =>
  userRateLimit({
    windowMs: HOUR,
    limit: 6,
    message: TOO_MANY_CODES,
    prefix,
  });

const changeVerifyLimiter = (prefix: string) =>
  userRateLimit({
    windowMs: QUARTER_HOUR,
    limit: 30,
    message: TOO_MANY_ATTEMPTS,
    prefix,
  });

router.post(
  "/register",
  otpSendLimiter,
  validateRequest(authValidation.registerValidationSchema),
  authController.register,
);
router.post(
  "/register/resend",
  otpSendLimiter,
  validateRequest(authValidation.resendOtpValidationSchema),
  authController.resendOtp,
);
router.post(
  "/register/verify",
  otpVerifyLimiter,
  validateRequest(authValidation.verifyOtpValidationSchema),
  authController.verifyOtp,
);

router.post(
  "/login",
  loginLimiter,
  validateRequest(authValidation.loginValidationSchema),
  authController.login,
);
router.post("/refresh-token", authController.refreshToken);
router.post("/logout", authController.logout);
router.get("/me", checkAuth, authController.getMe);

router.post(
  "/password/forgot",
  resetSendLimiter,
  validateRequest(authValidation.forgotPasswordValidationSchema),
  authController.forgotPassword,
);
router.post(
  "/password/forgot/resend",
  resetSendLimiter,
  validateRequest(authValidation.forgotPasswordValidationSchema),
  authController.resendResetCode,
);
router.post(
  "/password/verify",
  resetVerifyLimiter,
  validateRequest(authValidation.verifyResetValidationSchema),
  authController.verifyResetCode,
);
router.post(
  "/password/reset",
  resetVerifyLimiter,
  validateRequest(authValidation.resetPasswordValidationSchema),
  authController.resetPassword,
);
router.post(
  "/password/change",
  checkAuth,
  validateRequest(authValidation.changePasswordValidationSchema),
  authController.changePassword,
);

router.post(
  "/phone/change",
  checkAuth,
  changeSendLimiter("rl:phonechg:send:"),
  validateRequest(authValidation.changePhoneValidationSchema),
  authController.changePhone,
);
router.post(
  "/phone/change/resend",
  checkAuth,
  changeSendLimiter("rl:phonechg:send:"),
  authController.resendPhoneChangeCode,
);
router.post(
  "/phone/change/verify",
  checkAuth,
  changeVerifyLimiter("rl:phonechg:verify:"),
  validateRequest(authValidation.verifyCodeValidationSchema),
  authController.verifyPhoneChange,
);

router.post(
  "/email/change",
  checkAuth,
  changeSendLimiter("rl:emailchg:send:"),
  validateRequest(authValidation.changeEmailValidationSchema),
  authController.changeEmail,
);
router.post(
  "/email/change/resend",
  checkAuth,
  changeSendLimiter("rl:emailchg:send:"),
  authController.resendEmailChangeCode,
);
router.post(
  "/email/change/verify",
  checkAuth,
  changeVerifyLimiter("rl:emailchg:verify:"),
  validateRequest(authValidation.verifyCodeValidationSchema),
  authController.verifyEmailChange,
);

export const authRoutes: Router = router;
