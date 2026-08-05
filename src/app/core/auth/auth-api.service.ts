import {
  HttpClient,
} from '@angular/common/http';

import {
  Injectable,
  inject,
} from '@angular/core';

import {
  Observable,
} from 'rxjs';

import {
  environment,
} from '../../../environments/environment';

import {
  CartSessionService,
} from '../api/cart/cart-session.service';

import {
  AuthenticatedUserResponse,
  AuthSessionResponse,
  GoogleLoginRequest,
  LogoutResponse,
  PasswordLoginRequest,
  RegisterRequest,
} from './auth.models';

@Injectable({
  providedIn: 'root',
})
export class AuthApiService {
  private readonly http =
    inject(HttpClient);

  private readonly cartSession =
    inject(CartSessionService);

  private readonly apiUrl =
    environment.apiUrl.replace(
      /\/+$/,
      '',
    );

  private readonly baseUrl =
    `${this.apiUrl}/v1/auth`;

  login(
    payload: PasswordLoginRequest,
  ): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(
      `${this.baseUrl}/login`,
      this.withCartSession(
        payload,
      ),
    );
  }

  register(
    payload: RegisterRequest,
  ): Observable<AuthSessionResponse> {
    return this.http.post<AuthSessionResponse>(
      `${this.baseUrl}/register`,
      this.withCartSession(
        payload,
      ),
    );
  }

  loginWithGoogle(
    idToken: string,

    profile?: {
      phone?: string;
      firstName?: string;
      lastName?: string;
    },
  ): Observable<AuthSessionResponse> {
    const payload:
      GoogleLoginRequest = {
      id_token:
        idToken,

      ...(
        profile
          ?.phone
          ?.trim()
          ? {
              phone:
                profile.phone.trim(),
            }
          : {}
      ),

      ...(
        profile
          ?.firstName
          ?.trim()
          ? {
              first_name:
                profile.firstName.trim(),
            }
          : {}
      ),

      ...(
        profile
          ?.lastName
          ?.trim()
          ? {
              last_name:
                profile.lastName.trim(),
            }
          : {}
      ),
    };

    return this.http.post<AuthSessionResponse>(
      `${this.baseUrl}/firebase/google`,
      this.withCartSession(
        payload,
      ),
    );
  }

  me(): Observable<AuthenticatedUserResponse> {
    return this.http.get<AuthenticatedUserResponse>(
      `${this.baseUrl}/me`,
    );
  }

  logout(): Observable<LogoutResponse> {
    return this.http.post<LogoutResponse>(
      `${this.baseUrl}/logout`,
      {},
    );
  }

  /**
   * El identificador del carrito público se envía durante
   * el registro y el inicio de sesión.
   *
   * Laravel podrá asociar ese carrito con la nueva sesión
   * autenticada sin perder los productos seleccionados.
   */
  private withCartSession<
    T extends object,
  >(
    payload: T,
  ): T & {
    cart_session_id?: string;
  } {
    const sessionId =
      this.cartSession.get();

    return {
      ...payload,

      ...(
        sessionId
          ? {
              cart_session_id:
                sessionId,
            }
          : {}
      ),
    };
  }
}
