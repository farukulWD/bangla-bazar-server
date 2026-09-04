import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

export default {
  port: Number(process.env.PORT) || 5000,
  node_environment: process.env.NODE_ENV || "development",
  database_url: process.env.MONGO_URI || "",
  jwt_access_secret: process.env.JWT_SECRET || "",
  jwt_access_expiration: process.env.JWT_EXPIRATION || "1d",
  jwt_refresh_secret: process.env.JWT_REFRESH_SECRET || "",
  jwt_refresh_expiration: process.env.JWT_REFRESH_EXPIRATION || "7d",
  bcrypt_salt_rounds: Number(process.env.SALT_ROUND) || 12,
  email_service: process.env.EMAIL_SERVICE || "",
  email_user: process.env.EMAIL_USER || "",
  email_password: process.env.EMAIL_PASSWORD || "",
  email_from: process.env.EMAIL_FROM || "",
  email_host: process.env.EMAIL_HOST || "",
  email_port: Number(process.env.EMAIL_PORT) || 587,
  email_secure: process.env.EMAIL_SECURE === "true" || false,
  email_tls_reject_unauthorized:
    process.env.EMAIL_TLS_REJECT_UNAUTHORIZED === "true" || false,
  cloudinary_cloud_name: process.env.CLOUDINARY_CLOUD_NAME || "",
  cloudinary_api_key: process.env.CLOUDINARY_API_KEY || "",
  cloudinary_api_secret: process.env.CLOUDINARY_API_SECRET || "",
  redis_url: process.env.REDIS_URL || "",
  // The registration code's lifetime is also the resend cooldown — one live code per number.
  otp_code_ttl_seconds: Number(process.env.OTP_CODE_TTL_SECONDS) || 300,
  otp_pending_ttl_seconds: Number(process.env.OTP_PENDING_TTL_SECONDS) || 1800,
  otp_max_attempts: Number(process.env.OTP_MAX_ATTEMPTS) || 5,
  // A verified reset code buys this long to actually choose the new password.
  password_reset_token_ttl_seconds:
    Number(process.env.PASSWORD_RESET_TOKEN_TTL_SECONDS) || 900,
  refresh_cookie_max_age_ms:
    Number(process.env.REFRESH_COOKIE_MAX_AGE_MS) || 30 * 24 * 60 * 60 * 1000,
  client_url: process.env.CLIENT_URL || "http://localhost:3000",
  server_public_url: process.env.SERVER_PUBLIC_URL || "",
  ssl_store_id: process.env.STORE_ID || "",
  ssl_store_password: process.env.STORE_PASSWORD || "",
  ssl_is_live: process.env.SSL_IS_LIVE === "true",
  ssl_ipn_allowed_ips: (process.env.SSL_IPN_ALLOWED_IPS || "")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean),
  ssl_ipn_allow_any_ip: process.env.SSL_IPN_ALLOW_ANY_IP === "true",
  // Read only by `npm run seed:superadmin` — no HTTP route can create a superAdmin.
  superadmin_name: process.env.SUPERADMIN_NAME || "",
  superadmin_email: process.env.SUPERADMIN_EMAIL || "",
  superadmin_password: process.env.SUPERADMIN_PASSWORD || "",
};
