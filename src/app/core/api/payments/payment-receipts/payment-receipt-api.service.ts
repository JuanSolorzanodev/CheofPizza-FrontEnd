import {
  HttpClient,
  HttpResponse,
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
  PaymentReceiptCollectionResponse,
  PaymentReceiptResponse,
} from './payment-receipt.models';

@Injectable({
  providedIn: 'root',
})
export class PaymentReceiptApiService {
  private readonly http =
    inject(HttpClient);

  /**
   * Normaliza la URL configurada para evitar:
   *
   * /api//api/v1
   * /api/api/v1
   * /api/v1/api/v1
   *
   * Admite estas configuraciones:
   *
   * https://dominio.com
   * https://dominio.com/api
   * https://dominio.com/api/
   * https://dominio.com/api/v1
   */
  private readonly baseUrl =
    this.resolveApiBaseUrl(
      environment.apiUrl,
    );

  history(
    orderId: number,
  ): Observable<PaymentReceiptCollectionResponse> {
    return this.http.get<PaymentReceiptCollectionResponse>(
      `${this.baseUrl}/my/orders/${orderId}/payment-receipts`,
    );
  }

  latest(
    orderId: number,
  ): Observable<PaymentReceiptResponse> {
    return this.http.get<PaymentReceiptResponse>(
      `${this.baseUrl}/my/orders/${orderId}/payment-receipts/latest`,
    );
  }

  upload(
    orderId: number,
    file: File,
  ): Observable<PaymentReceiptResponse> {
    const formData =
      new FormData();

    formData.append(
      'receipt',
      file,
      file.name,
    );

    return this.http.post<PaymentReceiptResponse>(
      `${this.baseUrl}/my/orders/${orderId}/payment-receipts`,
      formData,
    );
  }

  file(
    receiptUuid: string,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.baseUrl}/payment-receipts/${receiptUuid}/file`,
      {
        observe: 'response',
        responseType: 'blob',
      },
    );
  }

  private resolveApiBaseUrl(
    configuredUrl: string,
  ): string {
    const normalized =
      configuredUrl
        .trim()
        .replace(/\/+$/, '');

    if (
      normalized.endsWith(
        '/api/v1',
      )
    ) {
      return normalized;
    }

    if (
      normalized.endsWith(
        '/api',
      )
    ) {
      return `${normalized}/v1`;
    }

    return `${normalized}/api/v1`;
  }
}
