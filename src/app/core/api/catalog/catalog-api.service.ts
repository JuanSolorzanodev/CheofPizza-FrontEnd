import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, combineLatest, map, Observable, shareReplay, throwError } from 'rxjs';

import { environment } from '../../../../environments/environment';
import { ApiCollectionResponse, IngredientDto, PizzaDto } from './catalog.models';

@Injectable({ providedIn: 'root' })
export class CatalogApiService {
  private readonly http = inject(HttpClient);

  private readonly baseUrl = environment.apiUrl.replace(/\/+$/, '/');

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

  // ✅ 3) Ingredientes
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

  /**
   * ✅ PROFESIONAL: Todas las pizzas (sin endpoint nuevo)
   * Combina sencillas + especiales, elimina duplicados por id y ordena por nombre.
   */
  private readonly allPizzas$ = combineLatest([this.sencillas$, this.especiales$]).pipe(
    map(([a, b]) => {
      const mapById = new Map<number, PizzaDto>();
      for (const p of [...(a ?? []), ...(b ?? [])]) mapById.set(p.id, p);
      return Array.from(mapById.values()).sort((x, y) => (x.name ?? '').localeCompare(y.name ?? ''));
    }),
    shareReplay({ bufferSize: 1, refCount: true })
  );

  getAllPizzas(): Observable<PizzaDto[]> {
    return this.allPizzas$;
  }

  /** ✅ 4) Buscar pizza por nombre */
  getPizzaByName(name: string): Observable<PizzaDto> {
    return this.http.get<ApiCollectionResponse<PizzaDto>>(
      `${this.baseUrl}v1/public/catalog/pizzas/${encodeURIComponent(name)}/search`
    ).pipe(
      map(res => (res?.data?.[0] ?? null)),
      map(p => {
        if (!p) throw new Error('Pizza no encontrada.');
        return p;
      }),
      catchError(err => {
        const message = err?.error?.message || err?.message || 'No se pudo cargar la pizza.';
        return throwError(() => new Error(message));
      })
    );
  }
}
