export enum PermissionModule {
  User = "user",
  Role = "role",
  Category = "category",
  Attribute = "attribute",
}

export type TPermissionOf<M extends PermissionModule> =
  (typeof PERMISSION_REGISTRY)[M][keyof (typeof PERMISSION_REGISTRY)[M]];

export type TAnyPermission = {
  [M in PermissionModule]: TPermissionOf<M>;
}[PermissionModule];

export enum UserPermission {
  ViewUsers = "can_view_users",
  AddUser = "can_add_user",
  EditUser = "can_edit_user",
  PromoteUser = "can_promote_user",
  DemoteUser = "can_demote_user",
  DeactivateUser = "can_deactivate_user",
  DeleteUser = "can_delete_user",
}

/**
 * A role is assigned to a user through the user module (`can_promote_user`,
 * `can_edit_user`), so there is deliberately no `can_assign_role` here.
 */
export enum RolePermission {
  ViewRoles = "can_view_roles",
  AddRole = "can_add_role",
  EditRole = "can_edit_role",
  DeleteRole = "can_delete_role",
}

export enum CategoryPermission {
  ViewCategories = "can_view_categories",
  AddCategory = "can_add_category",
  EditCategory = "can_edit_category",
  PublishCategory = "can_publish_category",
  DeleteCategory = "can_delete_category",
}

export enum AttributePermission {
  ViewAttributes = "can_view_attributes",
  AddAttribute = "can_add_attribute",
  EditAttribute = "can_edit_attribute",
  PublishAttribute = "can_publish_attribute",
  DeleteAttribute = "can_delete_attribute",
}

export const PERMISSION_REGISTRY = {
  [PermissionModule.User]: UserPermission,
  [PermissionModule.Role]: RolePermission,
  [PermissionModule.Category]: CategoryPermission,
  [PermissionModule.Attribute]: AttributePermission,
} as const;

export const PERMISSION_MODULE_LABELS: Record<PermissionModule, string> = {
  [PermissionModule.User]: "Users",
  [PermissionModule.Role]: "Roles",
  [PermissionModule.Category]: "Categories",
  [PermissionModule.Attribute]: "Attributes",
};

export const PERMISSION_LABELS: Record<TAnyPermission, string> = {
  [UserPermission.ViewUsers]: "View users",
  [UserPermission.AddUser]: "Add user",
  [UserPermission.EditUser]: "Edit user",
  [UserPermission.PromoteUser]: "Promote user",
  [UserPermission.DemoteUser]: "Demote user",
  [UserPermission.DeactivateUser]: "Deactivate user",
  [UserPermission.DeleteUser]: "Delete user",
  [RolePermission.ViewRoles]: "View roles",
  [RolePermission.AddRole]: "Add role",
  [RolePermission.EditRole]: "Edit role",
  [RolePermission.DeleteRole]: "Delete role",
  [CategoryPermission.ViewCategories]: "View categories",
  [CategoryPermission.AddCategory]: "Add category",
  [CategoryPermission.EditCategory]: "Edit category",
  [CategoryPermission.PublishCategory]: "Publish or unpublish category",
  [CategoryPermission.DeleteCategory]: "Delete category",
  [AttributePermission.ViewAttributes]: "View attributes",
  [AttributePermission.AddAttribute]: "Add attribute",
  [AttributePermission.EditAttribute]: "Edit attribute and its values",
  [AttributePermission.PublishAttribute]: "Publish or unpublish attribute",
  [AttributePermission.DeleteAttribute]: "Delete attribute or its values",
};

export const PERMISSION_MODULES = Object.values(PermissionModule);

export const permissionsOfModule = (
  module: PermissionModule,
): TAnyPermission[] =>
  Object.values(PERMISSION_REGISTRY[module]) as TAnyPermission[];

export const isValidPermission = (
  module: string,
  permission: string,
): boolean =>
  PERMISSION_MODULES.includes(module as PermissionModule) &&
  (permissionsOfModule(module as PermissionModule) as string[]).includes(
    permission,
  );

export const permissionCatalogue = () =>
  PERMISSION_MODULES.map((module) => ({
    module,
    label: PERMISSION_MODULE_LABELS[module],
    permissions: permissionsOfModule(module).map((key) => ({
      key,
      label: PERMISSION_LABELS[key],
    })),
  }));
