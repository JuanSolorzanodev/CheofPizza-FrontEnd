import {
  HttpClient,
  HttpHeaders,
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
  CapturePayPalOrderResponse,
  CreatePayPalOrderRequest,
  CreatePayPalOrderResponse,
  PayPalPaymentStatusResponse,
} from './paypal.models';

@Injectable({
  providedIn: 'root',
})
export class PayPalApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase =
    environment.apiUrl.replace(/\/$/, '');

  private readonly baseUrl =
    `${this.apiBase}/v1/payments/paypal`;

  createOrder(
    payload: CreatePayPalOrderRequest,
    idempotencyKey: string,
  ): Observable<CreatePayPalOrderResponse> {
    const headers = new HttpHeaders({
      'Idempotency-Key':
        idempotencyKey,
    });

    return this.http.post<CreatePayPalOrderResponse>(
      `${this.baseUrl}/orders`,
      payload,
      {
        headers,
      },
    );
  }

  getPaymentStatus(
    paymentId: string,
  ): Observable<PayPalPaymentStatusResponse> {
    const encodedPaymentId =
      encodeURIComponent(paymentId);

    return this.http.get<PayPalPaymentStatusResponse>(
      `${this.baseUrl}/orders/${encodedPaymentId}`,
    );
  }

  captureOrder(
    paymentId: string,
  ): Observable<CapturePayPalOrderResponse> {
    const encodedPaymentId =
      encodeURIComponent(paymentId);

    return this.http.post<CapturePayPalOrderResponse>(
      `${this.baseUrl}/orders/${encodedPaymentId}/capture`,
      {},
    );
  }
}
