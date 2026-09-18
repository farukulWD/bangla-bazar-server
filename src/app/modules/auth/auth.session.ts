import httpStatus from "http-status";
import AppError from "../../errors/AppError";

export const isTokenStale = (
  passwordChangedAt: Date | undefined,
  issuedAt: number | undefined,
): boolean => {
  if (!passwordChangedAt) {
    return false;
  }
  // A token with no `iat` cannot be dated, so it cannot be trusted past a password change.
  if (typeof issuedAt !== "number") {
    return true;
  }
  return issuedAt * 1000 < passwordChangedAt.getTime();
};

export const assertTokenNotStale = (
  passwordChangedAt: Date | undefined,
  issuedAt: number | undefined,
): void => {
  if (isTokenStale(passwordChangedAt, issuedAt)) {
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Your password was changed. Please log in again.",
    );
  }
};
