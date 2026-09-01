import AppError from "../../errors/AppError";
import { toBdE164, toE164 } from "../../utils/identifier";
import { TCreateUser, UserType } from "./user.interface";
import httpStatus from "http-status";
import { User } from "./user.model";
import { Role } from "../roles/roles.model";

const ROLE_PROJECTION = "name description isActive";

const assertRoleExists = async (roleId: string) => {
  const role = await Role.findById(roleId);

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  if (!role.isActive) {
    throw new AppError(httpStatus.BAD_REQUEST, "That role is inactive");
  }
};

const createStaffUser = async (payload: TCreateUser) => {
  const email = payload.email?.trim().toLowerCase();

  let phone: string | undefined;
  if (payload.phone) {
    // `toE164` has no default country, so the local forms a Bangladeshi user
    // types (`01712345678`, `880…`) fall through to `toBdE164`.
    const normalized = toE164(payload.phone) ?? toBdE164(payload.phone);
    if (!normalized) {
      throw new AppError(
        httpStatus.BAD_REQUEST,
        "That phone number is not valid",
      );
    }
    phone = normalized;
  }

  const clashes = [email ? { email } : null, phone ? { phone } : null].filter(
    (clause): clause is { email: string } | { phone: string } =>
      clause !== null,
  );

  if (!payload.name) {
    throw new AppError(httpStatus.BAD_REQUEST, "Name is required");
  }
  if (!payload.password) {
    throw new AppError(httpStatus.BAD_REQUEST, "Password is required");
  }

  const existing = await User.findOne({ $or: clashes });

  if (existing) {
    throw new AppError(
      httpStatus.CONFLICT,
      existing.email && existing.email === email
        ? "A user with that email already exists"
        : "A user with that phone number already exists",
    );
  }

  if (payload.role) {
    await assertRoleExists(payload.role);
  }
  const user = await User.create({
    ...payload,
    email,
    phone,
    userType: payload.userType ?? UserType.Admin,
  });

  return User.findById(user._id).populate("role", ROLE_PROJECTION);
};

export const userServices = { createStaffUser };
