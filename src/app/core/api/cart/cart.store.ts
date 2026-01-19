import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';

import { CartSessionService } from './cart-session.service';
import { CartAddPizzaRequestDto, CartDto } from './cart.models';
import { CartApiService } from './cart-api.service';

@Injectable({ providedIn: 'root' })
export class CartStore {
  private readonly api = inject(CartApiService);
  private readonly session = inject(CartSessionService);

  private readonly _cart = signal<CartDto | null>(null);
  readonly cart = computed(() => this._cart());

  readonly items = computed(() => this._cart()?.items ?? []);
  readonly totalUnits = computed(() => this._cart()?.total_units ?? 0);
  readonly total = computed(() => this._cart()?.total ?? 0);

  private readonly _loading = signal(false);
  readonly loading = computed(() => this._loading());

  private persistSessionFromResponse(res: any): void {
    const cart = res?.body?.data as CartDto | undefined;
    const headerSession = res?.headers?.get?.('X-Cart-Session') as string | null;

    const sessionId = headerSession ?? cart?.session_id ?? null;
    if (sessionId) this.session.set(sessionId);
  }

  hydrate(): void {
    this._loading.set(true);
    this.api.getCart()
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (res) => {
          this._cart.set(res.body?.data ?? null);
          this.persistSessionFromResponse(res);
        },
      });
  }

  addPizza(payload: CartAddPizzaRequestDto): void {
    this._loading.set(true);
    this.api.addPizza(payload)
      .pipe(finalize(() => this._loading.set(false)))
      .subscribe({
        next: (res) => {
          this._cart.set(res.body?.data ?? null);
          this.persistSessionFromResponse(res);
        },
      });
  }

  setQuantity(itemId: number, quantity: number | null | undefined): void {
  const q = Number(quantity);
  if (!Number.isFinite(q)) return;

  const safe = Math.max(1, Math.min(10, Math.trunc(q)));

  this.api.updateQuantity(itemId, safe).subscribe({
    next: (res) => {
      const cart = res.body?.data ?? null;
      this._cart.set(cart);
      this.persistSessionFromResponse(res); // ✅ consistente
    },
    error: () => this.hydrate(),
  });
}

remove(itemId: number): void {
  this.api.removeItem(itemId).subscribe({
    next: (res) => {
      const cart = res.body?.data ?? null;
      this._cart.set(cart);
      this.persistSessionFromResponse(res);
    },
  });
}

clear(): void {
  this.api.clear().subscribe({
    next: (res) => {
      const cart = res.body?.data ?? null;
      this._cart.set(cart);
      this.persistSessionFromResponse(res);
    },
  });
}
}
