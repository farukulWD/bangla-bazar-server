import mongoose from "mongoose";
import config from "../app/config";
import { UserType } from "../app/modules/users/user.interface";
import { User } from "../app/modules/users/user.model";
import connectDB from "../app/utils/db";

/**
 * No HTTP route can mint a superAdmin — `createStaffUserSchema` pins userType to
 * "admin" — so a fresh database gets its first one here. Everything the roles
 * module gates behind requireSuperAdmin is unreachable until this has run.
 */
const required = (value: string, name: string): string => {
  if (!value) {
    throw new Error(`${name} is not set in .env`);
  }
  return value;
};

const seedSuperAdmin = async () => {
  const name = required(config.superadmin_name, "SUPERADMIN_NAME");
  const email = required(
    config.superadmin_email,
    "SUPERADMIN_EMAIL",
  ).toLowerCase();
  const password = required(config.superadmin_password, "SUPERADMIN_PASSWORD");

  if (password.length < 8) {
    throw new Error("SUPERADMIN_PASSWORD must be at least 8 characters");
  }

  await connectDB();

  const existing = await User.findOne({ email });

  if (existing) {
    console.log(
      `A user with ${email} already exists (${existing.userType}). Nothing to do.`,
    );
    return;
  }

  // The password goes in plain: the model's pre("save") hook bcrypts it.
  const user = await User.create({
    name,
    email,
    password,
    userType: UserType.SuperAdmin,
    role: null,
    status: "active",
    isEmailVerify: true,
  });

  console.log(`superAdmin created: ${user.email}`);
};

seedSuperAdmin()
  .catch((err) => {
    console.error("Seed failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.disconnect();
  });
