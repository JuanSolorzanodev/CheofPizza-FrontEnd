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
  AdminPaginatedApiResponse,
  AdminPaymentTransactionFilters,
  AdminPaymentTransactionResponseData,
} from './admin-payment-transactions.models';

@Injectable({
  providedIn: 'root',
})
export class AdminPaymentTransactionsApiService {
  private readonly http =
    inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(
      /\/+$/,
      '',
    );

  private readonly endpoint =
    `${this.apiBase}/v1/admin/analytics/payment-transactions`;

  getTransactions(
    filters: AdminPaymentTransactionFilters,
  ): Observable<
    AdminPaginatedApiResponse<
      AdminPaymentTransactionResponseData
    >
  > {
    let params =
      new HttpParams()
        .set(
          'timezone',
          filters.timezone
            ?? 'America/Guayaquil',
        )
        .set(
          'page',
          filters.page
            ?? 1,
        )
        .set(
          'per_page',
          filters.per_page
            ?? 15,
        );

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

    if (filters.method) {
      params = params.set(
        'method',
        filters.method,
      );
    }

    if (filters.status) {
      params = params.set(
        'status',
        filters.status,
      );
    }

    const search =
      filters.search?.trim();

    if (search) {
      params = params.set(
        'search',
        search,
      );
    }

    return this.http.get<
      AdminPaginatedApiResponse<
        AdminPaymentTransactionResponseData
      >
    >(
      this.endpoint,
      {
        params,
      },
    );
  }
}
