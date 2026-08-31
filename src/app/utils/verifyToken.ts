import jwt, { JwtPayload } from "jsonwebtoken";
import AppError from "../errors/AppError";
import httpStatus from "http-status";
import config from "../config";

const varifyToken = (token: string) => {
  try {
    const decoded = jwt.verify(token, config.jwt_access_secret) as JwtPayload;
    return decoded;
  } catch (err) {
    console.log(err);
    throw new AppError(
      httpStatus.UNAUTHORIZED,
      "Session expired. Please try again",
    );
  }
};

export default varifyToken;
