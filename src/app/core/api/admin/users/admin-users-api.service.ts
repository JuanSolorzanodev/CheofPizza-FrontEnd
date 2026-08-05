import {
  HttpClient,
  HttpParams,
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
} from '../../../../../environments/environment';

import {
  AdminRolesResponse,
  AdminUserResponse,
  AdminUsersQuery,
  AdminUsersResponse,
  CreateAdminUserPayload,
  UpdateAdminUserPayload,
  UpdateAdminUserRolePayload,
  UpdateAdminUserStatusPayload,
} from './admin-users.models';

@Injectable({
  providedIn: 'root',
})
export class AdminUsersApiService {
  private readonly http =
    inject(HttpClient);

  /**
   * El proyecto define environment.apiUrl terminando en /api/.
   * Normalizamos la barra final y añadimos /v1 aquí,
   * siguiendo la misma convención de los demás servicios.
   */
  private readonly apiBase =
    environment.apiUrl.replace(
      /\/+$/,
      '',
    );

  private readonly baseUrl =
    `${this.apiBase}/v1/admin/users`;

  getUsers(
    query: AdminUsersQuery = {},
  ): Observable<AdminUsersResponse> {
    let params =
      new HttpParams();

    const search =
      query.search?.trim();

    if (search) {
      params = params.set(
        'search',
        search,
      );
    }

    if (query.role) {
      params = params.set(
        'role',
        query.role,
      );
    }

    if (query.status) {
      params = params.set(
        'status',
        query.status,
      );
    }

    if (query.page) {
      params = params.set(
        'page',
        String(query.page),
      );
    }

    if (query.per_page) {
      params = params.set(
        'per_page',
        String(query.per_page),
      );
    }

    return this.http.get<AdminUsersResponse>(
      this.baseUrl,
      {
        params,
      },
    );
  }

  getRoles(): Observable<AdminRolesResponse> {
    return this.http.get<AdminRolesResponse>(
      `${this.baseUrl}/roles`,
    );
  }

  getUser(
    userId: number,
  ): Observable<AdminUserResponse> {
    return this.http.get<AdminUserResponse>(
      `${this.baseUrl}/${userId}`,
    );
  }

  createUser(
    payload: CreateAdminUserPayload,
  ): Observable<AdminUserResponse> {
    return this.http.post<AdminUserResponse>(
      this.baseUrl,
      payload,
    );
  }

  updateUser(
    userId: number,
    payload: UpdateAdminUserPayload,
  ): Observable<AdminUserResponse> {
    return this.http.put<AdminUserResponse>(
      `${this.baseUrl}/${userId}`,
      payload,
    );
  }

  updateRole(
    userId: number,
    payload: UpdateAdminUserRolePayload,
  ): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(
      `${this.baseUrl}/${userId}/role`,
      payload,
    );
  }

  updateStatus(
    userId: number,
    payload: UpdateAdminUserStatusPayload,
  ): Observable<AdminUserResponse> {
    return this.http.patch<AdminUserResponse>(
      `${this.baseUrl}/${userId}/status`,
      payload,
    );
  }
}
