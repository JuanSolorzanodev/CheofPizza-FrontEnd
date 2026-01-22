import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';

export interface CheckoutConfigResponse {
  data: {
    transfer: {
      bank_name: string;
      account_type: string;
      account_number: string;
      holder_name: string;
      holder_id: string | null;
      qr_image_url: string | null;
      instructions: string | null;
    } | null;
  };
}

@Injectable({ providedIn: 'root' })
export class CheckoutConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/$/, '');

  getConfig() {
    return this.http.get<CheckoutConfigResponse>(`${this.apiBase}/v1/public/checkout/config`);
  }
}
