import { HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, finalize, map, of, tap, throwError } from 'rxjs';

import { AppLoggerService } from '../../logging/app-logger.service';

import { CartApiService } from './cart-api.service';
import {
  ApiResponse,
  CartAddPizzaRequestDto,
  CartAddPromotionRequestDto,
  CartDto,
} from './cart.models';
import { CartSessionService } from './cart-session.service';

@Injectable({
  providedIn: 'root',
})
export class CartStore {
  private readonly api = inject(CartApiService);

  private readonly session = inject(CartSessionService);

  private readonly logger = inject(AppLoggerService);

  private readonly cartState = signal<CartDto | null>(null);

  private readonly loadingState = signal(false);

  private readonly errorState = signal<string | null>(null);

  readonly cart = this.cartState.asReadonly();

  readonly loading = this.loadingState.asReadonly();

  readonly error = this.errorState.asReadonly();

  readonly items = computed(() => this.cartState()?.items ?? []);

  readonly totalUnits = computed(() => this.cartState()?.total_units ?? 0);

  readonly total = computed(() => this.cartState()?.total ?? 0);

  readonly isEmpty = computed(() => this.items().length === 0);

  hydrate(): void {
    if (this.loadingState()) {
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .getCart()
      .pipe(
        tap((response) => {
          this.applyResponse(response);
        }),

        catchError((error: unknown) => {
          this.handleError(error);

          /*
           * Un fallo del carrito público no debe impedir
           * que el resto de la aplicación cargue.
           */
          this.cartState.set(null);

          return of(null);
        }),

        finalize(() => {
          this.loadingState.set(false);
        }),
      )
      .subscribe();
  }

  addPizza(payload: CartAddPizzaRequestDto): Observable<CartDto | null> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.addPizza(payload).pipe(
      tap((response) => {
        this.applyResponse(response);
      }),

      map((response) => response.body?.data ?? null),

      catchError((error: unknown) => {
        this.handleError(error);

        return throwError(() => error);
      }),

      finalize(() => {
        this.loadingState.set(false);
      }),
    );
  }

  addPromotion(payload: CartAddPromotionRequestDto): Observable<CartDto | null> {
    this.loadingState.set(true);
    this.errorState.set(null);

    return this.api.addPromotion(payload).pipe(
      tap((response) => {
        this.applyResponse(response);
      }),

      map((response) => response.body?.data ?? null),

      catchError((error: unknown) => {
        this.handleError(error);

        return throwError(() => error);
      }),

      finalize(() => {
        this.loadingState.set(false);
      }),
    );
  }

  setQuantity(itemId: number, quantity: number | null | undefined): void {
    if (this.loadingState()) {
      return;
    }

    const numericQuantity = Number(quantity);

    if (!Number.isFinite(numericQuantity)) {
      return;
    }

    const safeQuantity = Math.min(10, Math.max(1, Math.trunc(numericQuantity)));

    let rehydrateAfterFailure = false;

    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .updateQuantity(itemId, safeQuantity)
      .pipe(
        tap((response) => {
          this.applyResponse(response);
        }),

        catchError((error: unknown) => {
          this.handleError(error);

          /*
           * Marcamos la resincronización para ejecutarla después de liberar
           * loadingState. Llamar hydrate() aquí no funcionaría porque hydrate()
           * protege contra cargas concurrentes y saldría inmediatamente.
           */
          rehydrateAfterFailure = true;

          return of(null);
        }),

        finalize(() => {
          this.loadingState.set(false);

          if (rehydrateAfterFailure) {
            this.hydrate();
          }
        }),
      )
      .subscribe();
  }

  remove(itemId: number): void {
    if (this.loadingState()) {
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .removeItem(itemId)
      .pipe(
        tap((response) => {
          this.applyResponse(response);
        }),

        catchError((error: unknown) => {
          this.handleError(error);

          return of(null);
        }),

        finalize(() => {
          this.loadingState.set(false);
        }),
      )
      .subscribe();
  }

  clear(): void {
    if (this.loadingState() || this.isEmpty()) {
      return;
    }

    this.loadingState.set(true);
    this.errorState.set(null);

    this.api
      .clear()
      .pipe(
        tap((response) => {
          this.applyResponse(response);
        }),

        catchError((error: unknown) => {
          this.handleError(error);

          return of(null);
        }),

        finalize(() => {
          this.loadingState.set(false);
        }),
      )
      .subscribe();
  }

  replaceCart(cart: CartDto | null): void {
    this.cartState.set(cart);
    this.errorState.set(null);

    const sessionId = cart?.session_id?.trim();

    if (sessionId) {
      this.session.set(sessionId);
    }
  }

  /**
   * Descarta completamente el carrito público almacenado
   * en este navegador.
   *
   * No llama al backend porque se usa al abandonar una sesión
   * administrativa u operativa. El carrito remoto puede expirar
   * conforme a las reglas del servidor, mientras el navegador
   * comienza con una sesión pública limpia.
   */
  discardLocalSession(): void {
    this.cartState.set(null);
    this.errorState.set(null);
    this.loadingState.set(false);

    this.session.clear();
  }

  /**
   * Limpia únicamente el estado reactivo, manteniendo el identificador
   * de sesión para poder volver a hidratar el mismo carrito.
   */
  resetState(): void {
    this.cartState.set(null);
    this.errorState.set(null);
    this.loadingState.set(false);
  }

  private applyResponse(response: HttpResponse<ApiResponse<CartDto>>): void {
    const cart = response.body?.data ?? null;

    this.cartState.set(cart);
    this.errorState.set(null);

    this.persistSession(response, cart);
  }

  private persistSession(
    response: HttpResponse<ApiResponse<CartDto>>,

    cart: CartDto | null,
  ): void {
    const headerSession = response.headers.get('X-Cart-Session')?.trim();

    const bodySession = cart?.session_id?.trim();

    const sessionId = headerSession || bodySession || null;

    if (sessionId) {
      this.session.set(sessionId);
    }
  }

  private handleError(error: unknown): void {
    if (!(error instanceof HttpErrorResponse)) {
      this.errorState.set('Ocurrió un error inesperado al procesar tu pedido.');

      this.logger.error('Error desconocido del carrito:', error);

      return;
    }

    if (error.status === 200) {
      this.errorState.set('El servidor devolvió una respuesta inválida para el carrito.');

      this.logger.error('Respuesta inválida del carrito.', {
        url: error.url,
        body: error.error,
        message: error.message,
      });

      return;
    }

    if (error.status === 0) {
      this.errorState.set('No se pudo conectar con el servidor.');

      return;
    }

    const backendMessage = typeof error.error?.message === 'string' ? error.error.message : null;

    this.errorState.set(backendMessage ?? 'No fue posible actualizar tu pedido.');

    this.logger.error('Error HTTP del carrito:', {
      status: error.status,
      url: error.url,
      body: error.error,
    });
  }
}
