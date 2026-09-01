export enum PermissionModule {
  User = "user",
  Category = "category",
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

export enum CategoryPermission {
  ViewCategories = "can_view_categories",
  AddCategory = "can_add_category",
  EditCategory = "can_edit_category",
  PublishCategory = "can_publish_category",
  DeleteCategory = "can_delete_category",
}

export const PERMISSION_REGISTRY = {
  [PermissionModule.User]: UserPermission,
  [PermissionModule.Category]: CategoryPermission,
} as const;

export const PERMISSION_LABELS: Record<TAnyPermission, string> = {
  [UserPermission.ViewUsers]: "View users",
  [UserPermission.AddUser]: "Add user",
  [UserPermission.EditUser]: "Edit user",
  [UserPermission.PromoteUser]: "Promote user",
  [UserPermission.DemoteUser]: "Demote user",
  [UserPermission.DeactivateUser]: "Deactivate user",
  [UserPermission.DeleteUser]: "Delete user",
  [CategoryPermission.ViewCategories]: "View categories",
  [CategoryPermission.AddCategory]: "Add category",
  [CategoryPermission.EditCategory]: "Edit category",
  [CategoryPermission.PublishCategory]: "Publish or unpublish category",
  [CategoryPermission.DeleteCategory]: "Delete category",
};
