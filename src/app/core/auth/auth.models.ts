import {
  CartDto,
} from '../api/cart/cart.models';

export interface AuthRole {
  id: number;
  name: string;
}

export interface AuthUser {
  id: number;
  role_id: number;
  role?: AuthRole | null;

  first_name: string;
  last_name: string;
  full_name?: string;

  phone: string | null;
  email: string;

  created_at?: string | null;
  updated_at?: string | null;

  /**
   * Campo exclusivo del frontend.
   *
   * Laravel no almacena actualmente la fotografía.
   * Cuando el acceso se realiza mediante Google,
   * se conserva la URL obtenida desde Firebase.
   */
  photo_url?: string | null;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  code?: string;
  errors?: Record<string, string[]>;
}

export interface AuthSessionData {
  token: string;
  user: AuthUser;
  cart: CartDto;
}

export type AuthSessionResponse =
  ApiResponse<AuthSessionData>;

export type GoogleLoginResponse =
  AuthSessionResponse;

export type AuthenticatedUserResponse =
  ApiResponse<AuthUser>;

export type LogoutResponse =
  ApiResponse<null>;

export interface PasswordLoginRequest {
  email: string;
  password: string;
  cart_session_id?: string;
}

export interface RegisterRequest {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  password: string;
  password_confirmation: string;
  cart_session_id?: string;
}

export interface GoogleLoginRequest {
  id_token: string;
  phone?: string;
  first_name?: string;
  last_name?: string;
  cart_session_id?: string;
}

export interface ApiErrorResponse {
  success?: boolean;
  message?: string;
  code?: string;
  errors?: Record<string, string[]>;
}
