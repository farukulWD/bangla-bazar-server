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
  bcrypt_salt_rounds: process.env.SALT_ROUND || 12,
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
};
