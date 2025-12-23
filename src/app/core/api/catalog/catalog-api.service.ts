import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, map, Observable, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import {
  ApiCollectionResponse,
  IngredientDto,
  PizzaDto
} from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  /**
   * environment.apiUrl ya viene como: http://localhost:8000/api/
   * Normalizamos para evitar dobles slashes.
   */
  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '/') ;

  private getCollection<T>(path: string): Observable<T[]> {
    return this.http.get<ApiCollectionResponse<T>>(`${this.baseUrl}${path}`).pipe(
      map((res) => res?.data ?? []),
      catchError((err) => {
        const message =
          err?.error?.message ||
          err?.message ||
          'No se pudo cargar el catálogo. Verifica el servidor/API.';
        return throwError(() => new Error(message));
      })
    );
  }

  // ✅ 1) Pizzas sencillas
  private readonly sencillas$ = this.getCollection<PizzaDto>('v1/public/catalog/pizzas/sencillas').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ✅ 2) Pizzas especiales
  private readonly especiales$ = this.getCollection<PizzaDto>('v1/public/catalog/pizzas/especiales').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  // ✅ 3) Ingredientes (para builder después)
  private readonly ingredients$ = this.getCollection<IngredientDto>('v1/public/catalog/ingredients').pipe(
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getPizzasSencillas(): Observable<PizzaDto[]> {
    return this.sencillas$;
  }

  getPizzasEspeciales(): Observable<PizzaDto[]> {
    return this.especiales$;
  }

  getIngredients(): Observable<IngredientDto[]> {
    return this.ingredients$;
  }
}
