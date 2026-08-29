import { TAuthUser } from "./auth.interface";

declare global {
  namespace Express {
    interface Request {
      // Optional: only routes behind the `isAuth` middleware have it set.
      user?: TAuthUser;
    }
  }
}
export {};
