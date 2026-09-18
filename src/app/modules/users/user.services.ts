import AppError from "../../errors/AppError";
import { toBdE164, toE164 } from "../../utils/identifier";
import { sendImageToCloudinary } from "../../utils/sendImageToCloudinary";
import {
  STAFF_USER_TYPES,
  TCreateUser,
  TUpdateMe,
  TUpdateStaffUser,
  TUser,
  TUserListQuery,
  TUserStatus,
  USER_SORTABLE_FIELDS,
  UserType,
} from "./user.interface";
import httpStatus from "http-status";
import { User } from "./user.model";
import { Role } from "../roles/roles.model";
import { QueryFilter, Types } from "mongoose";
import QueryBuilder from "../../builder/queryBuilder";
import { TAuthUser } from "../auth/auth.interface";

const USER_SEARCHABLE_FIELDS = ["name", "email", "phone"];

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

const parseBoolean = (value: unknown): boolean | undefined => {
  if (value === "true" || value === true) return true;
  if (value === "false" || value === false) return false;
  return undefined;
};

const parseDate = (value: unknown, endOfDay: boolean): Date | undefined => {
  if (typeof value !== "string" || !value.trim()) return undefined;

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return undefined;

  if (endOfDay && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())) {
    parsed.setUTCHours(23, 59, 59, 999);
  }

  return parsed;
};

export const parseUserListQuery = (
  query: Record<string, unknown>,
): TUserListQuery => {
  const rawSort = typeof query.sort === "string" ? query.sort : "";
  const sortField = rawSort.replace(/^-/, "");
  const sort = (USER_SORTABLE_FIELDS as readonly string[]).includes(sortField)
    ? rawSort
    : "-createdAt";

  const userType = String(query.userType ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter((value): value is UserType =>
      (Object.values(UserType) as string[]).includes(value),
    );

  const page = Math.max(1, Number(query.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 10));

  return {
    searchTerm:
      typeof query.searchTerm === "string"
        ? query.searchTerm.trim()
        : undefined,
    userType,
    isActive: parseBoolean(query.isActive),
    role: typeof query.role === "string" && query.role ? query.role : undefined,
    from: parseDate(query.from, false),
    to: parseDate(query.to, true),
    sort,
    page,
    limit,
  };
};

const searchVariants = (raw: string): string[] => {
  const term = raw.trim();
  if (!term) return [];

  const digits = term.replace(/\D/g, "");
  const withoutTrunkPrefix =
    digits.length > 1 && digits.startsWith("0") ? digits.slice(1) : null;

  return [term, withoutTrunkPrefix].filter((value): value is string =>
    Boolean(value),
  );
};

const escapeRegex = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
export const NOT_DELETED: QueryFilter<TUser> = { isDeleted: { $ne: true } };

/**
 * The three checks every admin-side mutation repeats: the target exists, it is not the
 * caller's own account, and it is not a superAdmin. `verb` is spliced into the message,
 * so pass the bare infinitive — "promote", "delete".
 */
const loadWriteTarget = async (
  id: string,
  actorId: Types.ObjectId,
  verb: string,
) => {
  const user = await User.findOne({ _id: id, ...NOT_DELETED });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user._id.equals(actorId)) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      `You cannot ${verb} your own account`,
    );
  }

  if (user.userType === UserType.SuperAdmin) {
    throw new AppError(
      httpStatus.FORBIDDEN,
      `A superAdmin account cannot be ${verb}d`,
    );
  }

  return user;
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

const getUsers = async (rawQuery: Record<string, unknown>) => {
  const query = parseUserListQuery(rawQuery);

  const filter: QueryFilter<TUser> = { ...NOT_DELETED };

  if (query.userType.length === 1) filter.userType = query.userType[0];
  else if (query.userType.length > 1) filter.userType = { $in: query.userType };
  // The query contract speaks `isActive`; the collection stores `status`.
  if (query.isActive !== undefined)
    filter.status = query.isActive ? "active" : "inactive";
  if (query.role) filter.role = query.role;

  const variants = query.searchTerm ? searchVariants(query.searchTerm) : [];

  if (variants.length > 0) {
    const pattern = variants.map(escapeRegex).join("|");
    filter.$or = USER_SEARCHABLE_FIELDS.map((field) => ({
      [field]: { $regex: pattern, $options: "i" },
    })) as QueryFilter<TUser>[];
  }

  const builder = new QueryBuilder(
    User.find(filter).populate("role", ROLE_PROJECTION),
    { sort: query.sort, page: query.page, limit: query.limit },
  )
    .dateRange("createdAt", query.from, query.to)
    .sort()
    .fields();

  await builder.paginate();

  const data = await builder.modelQuery;

  return {
    data,
    pagination: {
      page: query.page,
      limit: query.limit,
      total: builder.total,
      totalPage: Math.ceil(builder.total / query.limit),
    },
  };
};
const getUserById = async (id: string) => {
  const user = await User.findOne({ _id: id, ...NOT_DELETED }).populate(
    "role",
    ROLE_PROJECTION,
  );

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  return user;
};

const updateStaffUser = async (id: string, payload: TUpdateStaffUser) => {
  const user = await User.findOne({
    _id: id,
    userType: { $in: STAFF_USER_TYPES },
    ...NOT_DELETED,
  });

  if (!user) {
    throw new AppError(httpStatus.NOT_FOUND, "User not found");
  }

  if (user.userType === UserType.SuperAdmin && payload.role) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "A superAdmin bypasses every permission check and cannot hold a role",
    );
  }

  if (payload.role) {
    await assertRoleExists(payload.role);
  }

  return User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).populate("role", ROLE_PROJECTION);
};

const promoteUser = async (
  id: string,
  roleId: string,
  actorId: Types.ObjectId,
) => {
  const user = await loadWriteTarget(id, actorId, "promote");

  if (user.userType === UserType.Admin) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This user is already an admin. Change their role from the admins list instead.",
    );
  }

  // Registration through OTP alone leaves no password, and the panel is
  // password-only — promoting such an account would lock it out of what it was promoted for.
  const withPassword = await User.findById(id).select("+password");

  if (!withPassword?.password) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This account has no password set, so it could not sign in to the panel. Set one before promoting it.",
    );
  }

  await assertRoleExists(roleId);

  return User.findByIdAndUpdate(
    id,
    { userType: UserType.Admin, role: roleId },
    { new: true, runValidators: true },
  ).populate("role", ROLE_PROJECTION);
};

const demoteUser = async (id: string, actorId: Types.ObjectId) => {
  const user = await loadWriteTarget(id, actorId, "demote");

  if (user.userType !== UserType.Admin) {
    throw new AppError(
      httpStatus.BAD_REQUEST,
      "This user is not an admin, so there is nothing to demote.",
    );
  }

  return User.findByIdAndUpdate(
    id,
    { userType: UserType.Customer, role: null },
    { new: true, runValidators: true },
  ).populate("role", ROLE_PROJECTION);
};

const setUserStatus = async (
  id: string,
  status: TUserStatus,
  actorId: Types.ObjectId,
) => {
  await loadWriteTarget(
    id,
    actorId,
    status === "active" ? "activate" : "deactivate",
  );

  return User.findByIdAndUpdate(id, { status }, { new: true }).populate(
    "role",
    ROLE_PROJECTION,
  );
};

const softDeleteUser = async (id: string, actorId: Types.ObjectId) => {
  await loadWriteTarget(id, actorId, "delete");

  return User.findByIdAndUpdate(
    id,
    { isDeleted: true, status: "inactive" },
    { new: true },
  ).populate("role", ROLE_PROJECTION);
};

const updateMe = async (user: TAuthUser, payload: TUpdateMe) => {
  // Whitelisted field by field rather than spread: a body carrying `userType` or
  // `role` must not be able to promote its own sender.
  const update: TUpdateMe = {};

  if (payload.name !== undefined) update.name = payload.name;
  if (payload.address !== undefined) update.address = payload.address;
  if (payload.country !== undefined) update.country = payload.country;
  if (payload.city !== undefined) update.city = payload.city;

  const updated = await User.findOneAndUpdate(
    { _id: user._id, ...NOT_DELETED },
    update,
    { new: true, runValidators: true },
  ).populate("role", ROLE_PROJECTION);

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "This account no longer exists");
  }

  return updated;
};

const updateMyImage = async (user: TAuthUser, file: Express.Multer.File) => {
  const uploadResult = await sendImageToCloudinary(
    `user-image-${user._id}-${Date.now()}`,
    file.path,
    file.mimetype,
  );

  // The previous asset is left on Cloudinary: no `public_id` is persisted, so there is
  // nothing to destroy it by.
  const updated = await User.findOneAndUpdate(
    { _id: user._id, ...NOT_DELETED },
    { image: uploadResult.secure_url as string },
    { new: true },
  ).populate("role", ROLE_PROJECTION);

  if (!updated) {
    throw new AppError(httpStatus.NOT_FOUND, "This account no longer exists");
  }

  return updated;
};

export const userServices = {
  createStaffUser,
  getUsers,
  getUserById,
  updateStaffUser,
  promoteUser,
  demoteUser,
  setUserStatus,
  softDeleteUser,
  updateMe,
  updateMyImage,
};
