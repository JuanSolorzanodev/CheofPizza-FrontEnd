// src/app/core/api/builder/builder-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, throwError } from 'rxjs';
import { environment } from '../../../../environments/environment';

import type {
  ApiResponse,
  BuilderQuoteRequestDto,
  BuilderQuoteResponseDto
} from './builder.models';

@Injectable({ providedIn: 'root' })
export class BuilderApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '/');

  quote(payload: BuilderQuoteRequestDto): Observable<BuilderQuoteResponseDto> {
    return this.http
      .post<ApiResponse<BuilderQuoteResponseDto>>(`${this.baseUrl}v1/public/builder/quote`, payload)
      .pipe(
        map(res => res.data),
        catchError(err => {
          const message = err?.error?.message || err?.message || 'No se pudo cotizar la pizza.';
          return throwError(() => new Error(message));
        })
      );
  }
}
