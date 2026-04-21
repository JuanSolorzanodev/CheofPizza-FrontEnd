import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiCollectionResponse,
  ApiResponse,
  PromotionDto,
} from './promotion.models';

@Injectable({ providedIn: 'root' })
export class PromotionApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '/');

  getPromotions(): Observable<PromotionDto[]> {
    return this.http
      .get<ApiCollectionResponse<PromotionDto>>(`${this.baseUrl}v1/public/promotions`)
      .pipe(
        map((res) => res?.data ?? []),
        catchError((err) => {
          const message =
            err?.error?.message ||
            err?.message ||
            'No se pudieron cargar las promociones.';
          return throwError(() => new Error(message));
        })
      );
  }

  getPromotionBySlug(slug: string): Observable<PromotionDto> {
    return this.http
      .get<ApiResponse<PromotionDto>>(`${this.baseUrl}v1/public/promotions/${encodeURIComponent(slug)}`)
      .pipe(
        map((res) => {
          if (!res?.data) {
            throw new Error('Promoción no encontrada.');
          }
          return res.data;
        }),
        catchError((err) => {
          const message =
            err?.error?.message ||
            err?.message ||
            'No se pudo cargar la promoción.';
          return throwError(() => new Error(message));
        })
      );
  }
}
