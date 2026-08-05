import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { environment } from '../../../../../environments/environment';

import {
  AdminIngredient,
  AdminIngredientPayload,
  AdminIngredientPrice,
  AdminIngredientType,
  AdminIngredientTypePayload,
  AdminUpdateIngredientPricesPayload,
  AdminApiResponse,
  AdminCategory,
  AdminCategoryPayload,
  AdminCategorySizePrice,
  AdminPizza,
  AdminPizzaPayload,
  AdminPizzaVisibilityPayload,
  AdminSize,
  AdminSizePayload,
  AdminUpdateCategoryPricesPayload,
} from './admin-catalog.models';

@Injectable({
  providedIn: 'root',
})
export class AdminCatalogApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  private readonly base = `${this.apiBase}/v1/admin/catalog`;

  categories() {
    return this.http.get<AdminApiResponse<AdminCategory[]>>(`${this.base}/categories`);
  }

  createCategory(payload: AdminCategoryPayload) {
    return this.http.post<AdminApiResponse<AdminCategory>>(`${this.base}/categories`, payload);
  }

  updateCategory(categoryId: number, payload: AdminCategoryPayload) {
    return this.http.put<AdminApiResponse<AdminCategory>>(
      `${this.base}/categories/${categoryId}`,
      payload,
    );
  }

  deleteCategory(categoryId: number) {
    return this.http.delete<AdminApiResponse<null>>(`${this.base}/categories/${categoryId}`);
  }

  sizes() {
    return this.http.get<AdminApiResponse<AdminSize[]>>(`${this.base}/sizes`);
  }

  createSize(payload: AdminSizePayload) {
    return this.http.post<AdminApiResponse<AdminSize>>(`${this.base}/sizes`, payload);
  }

  updateSize(sizeId: number, payload: AdminSizePayload) {
    return this.http.put<AdminApiResponse<AdminSize>>(`${this.base}/sizes/${sizeId}`, payload);
  }

  deleteSize(sizeId: number) {
    return this.http.delete<AdminApiResponse<null>>(`${this.base}/sizes/${sizeId}`);
  }

  prices() {
    return this.http.get<AdminApiResponse<AdminCategorySizePrice[]>>(`${this.base}/prices`);
  }

  updatePrices(payload: AdminUpdateCategoryPricesPayload) {
    return this.http.put<AdminApiResponse<AdminCategorySizePrice[]>>(
      `${this.base}/prices`,
      payload,
    );
  }

  pizzas() {
    return this.http.get<AdminApiResponse<AdminPizza[]>>(`${this.base}/pizzas`);
  }

  pizza(pizzaId: number) {
    return this.http.get<AdminApiResponse<AdminPizza>>(`${this.base}/pizzas/${pizzaId}`);
  }

  createPizza(payload: AdminPizzaPayload) {
    return this.http.post<AdminApiResponse<AdminPizza>>(`${this.base}/pizzas`, payload);
  }

  updatePizza(pizzaId: number, payload: AdminPizzaPayload) {
    return this.http.put<AdminApiResponse<AdminPizza>>(`${this.base}/pizzas/${pizzaId}`, payload);
  }

  updatePizzaVisibility(pizzaId: number, payload: AdminPizzaVisibilityPayload) {
    return this.http.patch<AdminApiResponse<AdminPizza>>(
      `${this.base}/pizzas/${pizzaId}/visibility`,
      payload,
    );
  }

  deletePizza(pizzaId: number) {
    return this.http.delete<AdminApiResponse<null>>(`${this.base}/pizzas/${pizzaId}`);
  }
  ingredientTypes() {
    return this.http.get<AdminApiResponse<AdminIngredientType[]>>(`${this.base}/ingredient-types`);
  }

  createIngredientType(payload: AdminIngredientTypePayload) {
    return this.http.post<AdminApiResponse<AdminIngredientType>>(
      `${this.base}/ingredient-types`,
      payload,
    );
  }

  updateIngredientType(ingredientTypeId: number, payload: AdminIngredientTypePayload) {
    return this.http.put<AdminApiResponse<AdminIngredientType>>(
      `${this.base}/ingredient-types/${ingredientTypeId}`,
      payload,
    );
  }

  deleteIngredientType(ingredientTypeId: number) {
    return this.http.delete<AdminApiResponse<null>>(
      `${this.base}/ingredient-types/${ingredientTypeId}`,
    );
  }

  ingredients() {
    return this.http.get<AdminApiResponse<AdminIngredient[]>>(`${this.base}/ingredients`);
  }

  createIngredient(payload: AdminIngredientPayload) {
    return this.http.post<AdminApiResponse<AdminIngredient>>(`${this.base}/ingredients`, payload);
  }

  updateIngredient(ingredientId: number, payload: AdminIngredientPayload) {
    return this.http.put<AdminApiResponse<AdminIngredient>>(
      `${this.base}/ingredients/${ingredientId}`,
      payload,
    );
  }

  deleteIngredient(ingredientId: number) {
    return this.http.delete<AdminApiResponse<null>>(`${this.base}/ingredients/${ingredientId}`);
  }

  ingredientPrices() {
    return this.http.get<AdminApiResponse<AdminIngredientPrice[]>>(
      `${this.base}/ingredient-prices`,
    );
  }

  updateIngredientPrices(ingredientId: number, payload: AdminUpdateIngredientPricesPayload) {
    return this.http.put<AdminApiResponse<AdminIngredientPrice[]>>(
      `${this.base}/ingredients/${ingredientId}/prices`,
      payload,
    );
  }
}
