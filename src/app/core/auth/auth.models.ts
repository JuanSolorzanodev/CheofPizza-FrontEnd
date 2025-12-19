export interface AuthUser {
  id: number;
  role_id: number;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;

  // ✅ solo para UI (viene desde Firebase; no rompe si backend no lo manda)
  photo_url?: string | null;
}

export interface GoogleLoginResponse {
  token: string;
  user: AuthUser;
}

export interface ApiErrorResponse {
  message?: string;
  code?: string;
}
