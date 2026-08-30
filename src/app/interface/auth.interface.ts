// Shape of the JWT payload signed by `signInToken` in config/auth.js and
// attached to `req.user` by the `isAuth` middleware.
export type TAuthUser = {
  _id: string;
  name?: string;
  email?: string;
  address?: string;
  phone?: string;
  image?: string;
  iat?: number;
  exp?: number;
};
