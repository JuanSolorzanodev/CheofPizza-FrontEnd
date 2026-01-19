// src/app/core/state/cart/cart-session.service.ts
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class CartSessionService {
  private readonly key = 'cheof_cart_session';

  get(): string | null {
    return localStorage.getItem(this.key);
  }

  set(id: string): void {
    localStorage.setItem(this.key, id);
  }

  clear(): void {
    localStorage.removeItem(this.key);
  }
}
