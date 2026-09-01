import httpStatus from "http-status";
import catchAsync from "../../utils/catchAsync";
import sendResponse from "../../utils/sendResponse";
import { EmailChangeServices } from "./auth.emailChange.service";
import { TAuthUser } from "./auth.interface";
import { PasswordResetServices } from "./auth.passwordReset.service";
import { PhoneChangeServices } from "./auth.phoneChange.service";
import { RegistrationServices } from "./auth.registration.service";
import { AuthServices } from "./auth.services";
import {
  clearRefreshCookieOptions,
  REFRESH_COOKIE_NAME,
  refreshCookieOptions,
} from "./auth.utils";

const CODE_SENT = "Verification code sent";

const register = catchAsync(async (req, res) => {
  const result = await RegistrationServices.register(req.body);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const resendOtp = catchAsync(async (req, res) => {
  const result = await RegistrationServices.resendCode(req.body.identifier);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const verifyOtp = catchAsync(async (req, res) => {
  const { token, refreshToken, user } =
    await RegistrationServices.verifyAndCreate(
      req.body.identifier,
      req.body.code,
    );

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: "Account created successfully",
    data: { token, user },
  });
});

const login = catchAsync(async (req, res) => {
  const { token, refreshToken, user } = await AuthServices.login(req.body);

  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged in successfully",
    data: { token, user },
  });
});

const refreshToken = catchAsync(async (req, res) => {
  const result = await AuthServices.refreshAccessToken(
    req.cookies?.[REFRESH_COOKIE_NAME],
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Access token refreshed",
    data: result,
  });
});

const logout = catchAsync(async (_req, res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Logged out successfully",
    data: null,
  });
});

const getMe = catchAsync(async (req, res) => {
  const result = await AuthServices.getMe(req.user as TAuthUser);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Session retrieved successfully",
    data: result,
  });
});

const forgotPassword = catchAsync(async (req, res) => {
  const result = await PasswordResetServices.forgot(req.body.identifier);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset code sent",
    data: result,
  });
});

const resendResetCode = catchAsync(async (req, res) => {
  const result = await PasswordResetServices.resendCode(req.body.identifier);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password reset code sent",
    data: result,
  });
});

const verifyResetCode = catchAsync(async (req, res) => {
  const result = await PasswordResetServices.verifyCode(
    req.body.identifier,
    req.body.code,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Code verified",
    data: result,
  });
});

const resetPassword = catchAsync(async (req, res) => {
  await PasswordResetServices.resetPassword(
    req.body.resetToken,
    req.body.password,
  );

  // Every token issued before now is stale, so the session here is over too.
  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed. Please log in with your new password.",
    data: null,
  });
});

const changePassword = catchAsync(async (req, res) => {
  await AuthServices.changePassword(
    req.user as TAuthUser,
    req.body.currentPassword,
    req.body.newPassword,
  );

  res.clearCookie(REFRESH_COOKIE_NAME, clearRefreshCookieOptions());
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Password changed. Please log in with your new password.",
    data: null,
  });
});

const changePhone = catchAsync(async (req, res) => {
  const result = await PhoneChangeServices.requestPhoneChange(
    req.user as TAuthUser,
    req.body.phone,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const resendPhoneChangeCode = catchAsync(async (req, res) => {
  const result = await PhoneChangeServices.resendPhoneChangeCode(
    req.user as TAuthUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const verifyPhoneChange = catchAsync(async (req, res) => {
  const result = await PhoneChangeServices.verifyPhoneChange(
    req.user as TAuthUser,
    req.body.code,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Mobile number updated successfully",
    data: result,
  });
});

const changeEmail = catchAsync(async (req, res) => {
  const result = await EmailChangeServices.requestEmailChange(
    req.user as TAuthUser,
    req.body.email,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const resendEmailChangeCode = catchAsync(async (req, res) => {
  const result = await EmailChangeServices.resendEmailChangeCode(
    req.user as TAuthUser,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: CODE_SENT,
    data: result,
  });
});

const verifyEmailChange = catchAsync(async (req, res) => {
  const result = await EmailChangeServices.verifyEmailChange(
    req.user as TAuthUser,
    req.body.code,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: "Email address updated successfully",
    data: result,
  });
});

export const authController = {
  register,
  resendOtp,
  verifyOtp,
  login,
  refreshToken,
  logout,
  getMe,
  forgotPassword,
  resendResetCode,
  verifyResetCode,
  resetPassword,
  changePassword,
  changePhone,
  resendPhoneChangeCode,
  verifyPhoneChange,
  changeEmail,
  resendEmailChangeCode,
  verifyEmailChange,
};
