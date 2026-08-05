export type AdminUserRoleName =
  | 'admin'
  | 'operator'
  | 'customer';

export type AdminUserStatusFilter =
  | 'all'
  | 'active'
  | 'inactive';

export interface AdminUserRole {
  id: number;
  name: AdminUserRoleName;
  label?: string;
}

export interface AdminUserUsage {
  carts: number;
  orders: number;
  payments: number;
}

export interface AdminUser {
  id: number;
  role_id: number;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  email: string;
  is_active: boolean;
  role: AdminUserRole;
  usage: AdminUserUsage;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminUserPaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminUsersResponse {
  success: boolean;
  message: string;
  data: AdminUser[];
  meta: AdminUserPaginationMeta;
}

export interface AdminUserResponse {
  success: boolean;
  message: string;
  data: AdminUser;
}

export interface AdminRolesResponse {
  success: boolean;
  message: string;
  data: AdminUserRole[];
}

export interface AdminUsersQuery {
  search?: string;
  role?: AdminUserRoleName | '';
  status?: 'active' | 'inactive' | '';
  page?: number;
  per_page?: number;
}

export interface CreateAdminUserPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  role: AdminUserRoleName;
  is_active: boolean;
}

export interface UpdateAdminUserPayload {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
}

export interface UpdateAdminUserRolePayload {
  role: AdminUserRoleName;
}

export interface UpdateAdminUserStatusPayload {
  is_active: boolean;
}

export interface AdminUserValidationErrorResponse {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}
