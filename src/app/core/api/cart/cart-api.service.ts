// src/app/core/api/cart/cart-api.service.ts
import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { ApiResponse, CartDto, CartAddPizzaRequestDto } from './cart.models';

@Injectable({ providedIn: 'root' })
export class CartApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');
  private readonly base = `${this.apiBase}/v1/public/cart`;

  getCart() {
    return this.http.get<ApiResponse<CartDto>>(this.base, { observe: 'response' });
  }

  addPizza(payload: CartAddPizzaRequestDto) {
    return this.http.post<ApiResponse<CartDto>>(`${this.base}/items/pizza`, payload, { observe: 'response' });
  }

  updateQuantity(itemId: number, quantity: number) {
    return this.http.put<ApiResponse<CartDto>>(
      `${this.base}/items/${itemId}`,
      { quantity },
      { observe: 'response' }
    );
  }

  removeItem(itemId: number) {
    return this.http.delete<ApiResponse<CartDto>>(
      `${this.base}/items/${itemId}`,
      { observe: 'response' }
    );
  }

  clear() {
    return this.http.delete<ApiResponse<CartDto>>(
      this.base,
      { observe: 'response' }
    );
  }
}
