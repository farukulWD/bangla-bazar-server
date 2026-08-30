import jwt, { JwtPayload } from "jsonwebtoken";
import AppError from "../errors/AppError";
import httpStatus from "http-status";

const varifyToken = (token: string, secret: string) => {
  try {
    const decoded = jwt.verify(token, secret as string) as JwtPayload;
    return decoded;
  } catch (err) {
    console.log(err);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Session expired. Please try again"
    );
  }
};

export default varifyToken;
