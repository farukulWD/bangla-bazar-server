import { TAuthUser } from "../modules/auth/auth.interface";

declare global {
  namespace Express {
    interface Request {
      user?: TAuthUser;
    }
  }
}
export {};
