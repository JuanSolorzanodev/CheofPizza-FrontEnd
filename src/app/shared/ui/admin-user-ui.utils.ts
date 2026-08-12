import {
  AdminUser,
  AdminUserRoleName,
} from '../../core/api/admin/users/admin-users.models';

export type AdminUserTagSeverity =
  | 'success'
  | 'info'
  | 'warn'
  | 'danger'
  | 'secondary'
  | 'contrast';

export function adminUserRoleLabel(
  role: AdminUserRoleName,
): string {
  switch (role) {
    case 'admin':
      return 'Administrador';

    case 'operator':
      return 'Operador';

    default:
      return 'Cliente';
  }
}

export function adminUserRoleSeverity(
  role: AdminUserRoleName,
): AdminUserTagSeverity {
  switch (role) {
    case 'admin':
      return 'danger';

    case 'operator':
      return 'warn';

    default:
      return 'info';
  }
}

export function adminUserStatusLabel(
  user: Pick<AdminUser, 'is_active'>,
): string {
  return user.is_active
    ? 'Activo'
    : 'Bloqueado';
}

export function adminUserStatusSeverity(
  user: Pick<AdminUser, 'is_active'>,
): 'success' | 'danger' {
  return user.is_active
    ? 'success'
    : 'danger';
}

export function adminUserInitials(
  user: Pick<
    AdminUser,
    'first_name' | 'last_name'
  >,
): string {
  const first =
    user.first_name
      ?.trim()
      .charAt(0) ?? '';

  const last =
    user.last_name
      ?.trim()
      .charAt(0) ?? '';

  return (
    `${first}${last}`.toUpperCase() ||
    'U'
  );
}
