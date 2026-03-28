import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse, OrderDto } from './checkout.models';

@Injectable({ providedIn: 'root' })
export class MyOrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  private readonly base = `${this.apiBase}/v1/my/orders`;

  list(page = 1) {
    const params = new HttpParams().set('page', page);
    return this.http.get<any>(this.base, { params }); // Laravel paginate resource
  }

  show(orderId: number) {
    return this.http.get<ApiResponse<OrderDto>>(`${this.base}/${orderId}`);
  }
}
