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
} from '../../../../environments/environment';

import {
  ApiPaginated,
  ApiResource,
  OperatorOrderDetailDto,
  OperatorOrderListDto,
  OperatorOrdersFilters,
  OperatorQueueResponse,
  OperatorStatusesResponse,
} from './operator-orders.models';

@Injectable({
  providedIn: 'root',
})
export class OperatorOrdersApiService {
  private readonly http =
    inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(
      /\/$/,
      '',
    );

  private readonly baseUrl =
    `${this.apiBase}/v1/operator/orders`;

  list(
    filters: OperatorOrdersFilters = {},
  ): Observable<
    ApiPaginated<OperatorOrderListDto>
  > {
    let params = new HttpParams();

    for (
      const [key, value]
      of Object.entries(filters)
    ) {
      if (
        value === null ||
        value === undefined ||
        value === ''
      ) {
        continue;
      }

      params = params.set(
        key,
        String(value),
      );
    }

    return this.http.get<
      ApiPaginated<OperatorOrderListDto>
    >(
      this.baseUrl,
      {
        params,
      },
    );
  }

  show(
    orderId: number,
  ): Observable<
    ApiResource<OperatorOrderDetailDto>
  > {
    return this.http.get<
      ApiResource<OperatorOrderDetailDto>
    >(
      `${this.baseUrl}/${orderId}`,
    );
  }

  queue(): Observable<OperatorQueueResponse> {
    return this.http.get<OperatorQueueResponse>(
      `${this.baseUrl}/queue`,
    );
  }

  statuses(): Observable<OperatorStatusesResponse> {
    return this.http.get<OperatorStatusesResponse>(
      `${this.baseUrl}/statuses`,
    );
  }

  updateStatus(
    orderId: number,
    toStatus: string,
    note?: string,
  ): Observable<
    ApiResource<OperatorOrderDetailDto>
  > {
    return this.http.patch<
      ApiResource<OperatorOrderDetailDto>
    >(
      `${this.baseUrl}/${orderId}/status`,
      {
        to_status: toStatus,
        note: note?.trim() || null,
      },
    );
  }
}
