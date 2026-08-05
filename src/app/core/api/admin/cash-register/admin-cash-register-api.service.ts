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
  ApiResponse,
  CashMovement,
  CashSession,
  CashSessionDetail,
  CashSessionHistoryFilters,
  CashSessionSummary,
  CloseCashSessionPayload,
  OpenCashSessionPayload,
  PaginatedApiResponse,
  StoreCashMovementPayload,
} from './admin-cash-register.models';

@Injectable({
  providedIn: 'root',
})
export class AdminCashRegisterApiService {
  private readonly http =
    inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(
      /\/+$/,
      '',
    );

  private readonly baseUrl =
    `${this.apiBase}/v1/admin/cash-register`;

  getCurrent():
    Observable<
      ApiResponse<CashSession | null>
    > {
    return this.http.get<
      ApiResponse<CashSession | null>
    >(
      `${this.baseUrl}/current`,
    );
  }

  open(
    payload: OpenCashSessionPayload,
  ): Observable<
    ApiResponse<CashSession>
  > {
    return this.http.post<
      ApiResponse<CashSession>
    >(
      `${this.baseUrl}/open`,
      payload,
    );
  }

  getSummary(
    uuid: string,
  ): Observable<
    ApiResponse<CashSessionSummary>
  > {
    return this.http.get<
      ApiResponse<CashSessionSummary>
    >(
      `${this.baseUrl}/${uuid}/summary`,
    );
  }

  getMovements(
    uuid: string,
    perPage = 10,
  ): Observable<
    PaginatedApiResponse<CashMovement[]>
  > {
    const params =
      new HttpParams().set(
        'per_page',
        perPage,
      );

    return this.http.get<
      PaginatedApiResponse<
        CashMovement[]
      >
    >(
      `${this.baseUrl}/${uuid}/movements`,
      {
        params,
      },
    );
  }

  storeMovement(
    uuid: string,
    payload: StoreCashMovementPayload,
  ): Observable<
    ApiResponse<CashMovement>
  > {
    return this.http.post<
      ApiResponse<CashMovement>
    >(
      `${this.baseUrl}/${uuid}/movements`,
      payload,
    );
  }

  close(
    uuid: string,
    payload: CloseCashSessionPayload,
  ): Observable<
    ApiResponse<CashSession>
  > {
    return this.http.post<
      ApiResponse<CashSession>
    >(
      `${this.baseUrl}/${uuid}/close`,
      payload,
    );
  }

  getHistory(
    filters:
      CashSessionHistoryFilters = {},
  ): Observable<
    PaginatedApiResponse<
      CashSession[]
    >
  > {
    let params =
      new HttpParams();

    if (filters.date_from) {
      params = params.set(
        'date_from',
        filters.date_from,
      );
    }

    if (filters.date_to) {
      params = params.set(
        'date_to',
        filters.date_to,
      );
    }

    if (filters.status) {
      params = params.set(
        'status',
        filters.status,
      );
    }

    params = params
      .set(
        'page',
        filters.page ?? 1,
      )
      .set(
        'per_page',
        filters.per_page ?? 15,
      );

    return this.http.get<
      PaginatedApiResponse<
        CashSession[]
      >
    >(
      `${this.baseUrl}/history`,
      {
        params,
      },
    );
  }

  getDetail(
    uuid: string,
  ): Observable<
    ApiResponse<CashSessionDetail>
  > {
    return this.http.get<
      ApiResponse<CashSessionDetail>
    >(
      `${this.baseUrl}/${uuid}`,
    );
  }
}
