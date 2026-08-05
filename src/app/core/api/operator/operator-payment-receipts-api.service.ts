import {
  HttpClient,
  HttpParams,
  HttpResponse,
} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

import { environment } from '../../../../environments/environment';

import {
  PaymentReceiptPaginatedResponse,
  PaymentReceiptResourceResponse,
} from '../payments/payment-receipts/payment-receipt.models';

@Injectable({
  providedIn: 'root',
})
export class OperatorPaymentReceiptsApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = this.resolveApiBaseUrl(
    environment.apiUrl,
  );

  private readonly operatorBaseUrl =
    `${this.apiBase}/operator/payment-receipts`;

  private readonly receiptFileBaseUrl =
    `${this.apiBase}/payment-receipts`;

  /**
   * Obtiene únicamente comprobantes pendientes de revisión.
   */
  listPending(
    page = 1,
    perPage = 15,
  ): Observable<PaymentReceiptPaginatedResponse> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('per_page', String(perPage));

    return this.http.get<PaymentReceiptPaginatedResponse>(
      this.operatorBaseUrl,
      {
        params,
      },
    );
  }

  /**
   * Aprueba un comprobante pendiente.
   */
  approve(
    receiptUuid: string,
  ): Observable<PaymentReceiptResourceResponse> {
    return this.http.patch<PaymentReceiptResourceResponse>(
      `${this.operatorBaseUrl}/${receiptUuid}/approve`,
      {},
    );
  }

  /**
   * Rechaza un comprobante pendiente.
   *
   * El backend exige entre 5 y 500 caracteres.
   */
  reject(
    receiptUuid: string,
    reason: string,
  ): Observable<PaymentReceiptResourceResponse> {
    return this.http.patch<PaymentReceiptResourceResponse>(
      `${this.operatorBaseUrl}/${receiptUuid}/reject`,
      {
        reason: reason.trim(),
      },
    );
  }

  /**
   * Descarga el archivo privado usando la sesión autenticada.
   */
  file(
    receiptUuid: string,
  ): Observable<HttpResponse<Blob>> {
    return this.http.get(
      `${this.receiptFileBaseUrl}/${receiptUuid}/file`,
      {
        observe: 'response',
        responseType: 'blob',
      },
    );
  }

  private resolveApiBaseUrl(
    configuredUrl: string,
  ): string {
    const normalized = configuredUrl
      .trim()
      .replace(/\/+$/, '');

    if (normalized.endsWith('/api/v1')) {
      return normalized;
    }

    if (normalized.endsWith('/api')) {
      return `${normalized}/v1`;
    }

    return `${normalized}/api/v1`;
  }
}
