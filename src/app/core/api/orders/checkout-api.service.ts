import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse, CheckoutRequestDto, OrderDto } from './checkout.models';

@Injectable({ providedIn: 'root' })
export class CheckoutApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');
  private readonly base = `${this.apiBase}/v1/checkout`;

  checkout(payload: CheckoutRequestDto) {
    return this.http.post<ApiResponse<OrderDto>>(this.base, payload);
  }
}
