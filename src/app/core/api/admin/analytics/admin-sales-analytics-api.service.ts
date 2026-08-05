import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../../environments/environment';

import {
  AdminAnalyticsDateRangeFilters,
  AdminApiResponse,
  AdminDailySalesData,
  AdminDashboardAnalyticsBundle,
  AdminHourlySalesData,
  AdminPaymentAnalyticsData,
  AdminProductPerformanceData,
  AdminSalesDashboardData,
} from './admin-sales-analytics.models';

@Injectable({
  providedIn: 'root',
})
export class AdminSalesAnalyticsApiService {
  private readonly http = inject(HttpClient);

  private readonly apiBase = environment.apiUrl.replace(/\/+$/, '');

  private readonly analyticsBase = `${this.apiBase}/v1/admin/analytics`;

  getDashboard(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminApiResponse<AdminSalesDashboardData>> {
    return this.http.get<AdminApiResponse<AdminSalesDashboardData>>(
      `${this.analyticsBase}/dashboard`,
      {
        params: this.buildDateParams(filters),
      },
    );
  }

  getDailySales(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminApiResponse<AdminDailySalesData>> {
    return this.http.get<AdminApiResponse<AdminDailySalesData>>(
      `${this.analyticsBase}/sales/daily`,
      {
        params: this.buildDateParams(filters),
      },
    );
  }

  getHourlySales(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminApiResponse<AdminHourlySalesData>> {
    return this.http.get<AdminApiResponse<AdminHourlySalesData>>(
      `${this.analyticsBase}/sales/hourly`,
      {
        params: this.buildDateParams(filters),
      },
    );
  }

  getProductPerformance(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminApiResponse<AdminProductPerformanceData>> {
    return this.http.get<AdminApiResponse<AdminProductPerformanceData>>(
      `${this.analyticsBase}/products`,
      {
        params: this.buildDateParams(filters),
      },
    );
  }

  getPaymentAnalytics(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminApiResponse<AdminPaymentAnalyticsData>> {
    return this.http.get<AdminApiResponse<AdminPaymentAnalyticsData>>(
      `${this.analyticsBase}/payments`,
      {
        params: this.buildDateParams(filters),
      },
    );
  }

  /**
   * Carga simultáneamente todos los módulos analíticos
   * necesarios para construir el dashboard administrativo.
   *
   * forkJoin espera que todas las solicitudes terminen
   * antes de emitir un único resultado consistente.
   */
  getDashboardBundle(
    filters: AdminAnalyticsDateRangeFilters,
  ): Observable<AdminDashboardAnalyticsBundle> {
    return forkJoin({
      dashboard: this.getDashboard(filters),

      daily: this.getDailySales(filters),

      hourly: this.getHourlySales(filters),

      products: this.getProductPerformance(filters),

      payments: this.getPaymentAnalytics(filters),
    }).pipe(
      map((response) => ({
        dashboard: response.dashboard.data,

        daily: response.daily.data,

        hourly: response.hourly.data,

        products: response.products.data,

        payments: response.payments.data,
      })),
    );
  }

  private buildDateParams(filters: AdminAnalyticsDateRangeFilters): HttpParams {
    let params = new HttpParams().set('timezone', filters.timezone ?? 'America/Guayaquil');

    if (filters.date_from) {
      params = params.set('date_from', filters.date_from);
    }

    if (filters.date_to) {
      params = params.set('date_to', filters.date_to);
    }

    return params;
  }
}
