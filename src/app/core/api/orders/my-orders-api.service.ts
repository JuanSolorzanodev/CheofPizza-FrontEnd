import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiResponse, OrderDto } from './checkout.models';

export interface MyOrdersPaginationMeta {
  current_page: number;
  from: number | null;
  last_page: number;
  path: string;
  per_page: number;
  to: number | null;
  total: number;
}

export interface MyOrdersPaginationLinks {
  first: string | null;
  last: string | null;
  prev: string | null;
  next: string | null;
}

/**
 * Respuesta exacta producida por MyOrdersController@index.
 */
export interface MyOrdersPaginatedResponse {
  data: OrderDto[];
  meta: MyOrdersPaginationMeta;
  links: MyOrdersPaginationLinks;
}

@Injectable({
  providedIn: 'root',
})
export class MyOrdersApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');
  private readonly baseUrl = `${this.apiBase}/v1/my/orders`;

  /**
   * Obtiene una página real del historial del cliente.
   *
   * El backend admite entre 1 y 50 registros por página.
   * La pantalla utiliza 10 para conservar una navegación clara.
   */
  list(page = 1, perPage = 10): Observable<MyOrdersPaginatedResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));

    return this.http.get<MyOrdersPaginatedResponse>(this.baseUrl, {
      params,
    });
  }

  show(orderId: number): Observable<ApiResponse<OrderDto>> {
    return this.http.get<ApiResponse<OrderDto>>(
      `${this.baseUrl}/${orderId}`,
    );
  }
}
