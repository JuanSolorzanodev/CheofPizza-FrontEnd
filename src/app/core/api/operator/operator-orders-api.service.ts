import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import {
  ApiPaginated,
  ApiResource,
  OperatorOrderDetailDto,
  OperatorOrderListDto,
  QueueCountsDto,
} from './operator-orders.models';

@Injectable({ providedIn: 'root' })
export class OperatorOrdersApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');
  private readonly base = `${this.apiBase}/v1/operator/orders`;

  list(filters: Record<string, any> = {}) {
    let params = new HttpParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v === null || v === undefined || v === '') return;
      params = params.set(k, String(v));
    });

    // Laravel Resource Collection paginada suele devolver { data: [...], meta, links }
    return this.http.get<ApiPaginated<OperatorOrderListDto>>(this.base, { params });
  }

  show(orderId: number) {
    return this.http.get<ApiResource<OperatorOrderDetailDto>>(`${this.base}/${orderId}`);
  }

  queue() {
    return this.http.get<{ data: QueueCountsDto }>(`${this.base}/queue`);
  }

  statuses() {
    return this.http.get<{ data: string[] }>(`${this.base}/statuses`);
  }

  updateStatus(orderId: number, to_status: string, note?: string) {
    return this.http.patch<ApiResource<OperatorOrderDetailDto>>(`${this.base}/${orderId}/status`, {
      to_status,
      note: note ?? null,
    });
  }
}
