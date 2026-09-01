import httpStatus from "http-status";
import QueryBuilder from "../../builder/queryBuilder";
import AppError from "../../errors/AppError";
import { TPagination } from "../../interface/common";
import { User } from "../users/user.model";
import { NOT_DELETED } from "../users/user.services";
import {
  ROLE_QUERY_CONTROL_KEYS,
  ROLE_SEARCHABLE_FIELDS,
} from "./roles.constant";
import { TCreateRole, TRole, TUpdateRole } from "./roles.interface";
import { Role } from "./roles.model";

const createRole = async (payload: TCreateRole) => {
  return Role.create(payload);
};

const getRoles = async (
  query: Record<string, unknown>,
): Promise<{ data: TRole[]; pagination: TPagination }> => {
  const roleQuery = new QueryBuilder(Role.find(), query)
    .search(ROLE_SEARCHABLE_FIELDS)
    .filter(ROLE_QUERY_CONTROL_KEYS)
    .sort();

  await roleQuery.paginate();
  roleQuery.fields();

  const data = await roleQuery.modelQuery;

  const page = Number(query.page) > 0 ? Number(query.page) : 1;
  const limit = Number(query.limit) > 0 ? Number(query.limit) : 10;

  return {
    data,
    pagination: {
      page,
      limit,
      total: roleQuery.total,
      totalPage: Math.ceil(roleQuery.total / limit),
    },
  };
};

const getRoleById = async (id: string) => {
  const role = await Role.findById(id);

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  return role;
};

const updateRole = async (id: string, payload: TUpdateRole) => {
  const role = await Role.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  });

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  return role;
};

const deleteRole = async (id: string) => {
  // Soft-deleted users are excluded: they are invisible in the panel, so counting
  // them would block the deletion with a number nobody can act on.
  const assignedCount = await User.countDocuments({ role: id, ...NOT_DELETED });

  if (assignedCount > 0) {
    throw new AppError(
      httpStatus.CONFLICT,
      `This role is assigned to ${assignedCount} user(s). Reassign them before deleting it.`,
    );
  }

  const role = await Role.findByIdAndDelete(id);

  if (!role) {
    throw new AppError(httpStatus.NOT_FOUND, "Role not found");
  }

  return role;
};

export const roleServices = {
  createRole,
  getRoles,
  getRoleById,
  updateRole,
  deleteRole,
};
