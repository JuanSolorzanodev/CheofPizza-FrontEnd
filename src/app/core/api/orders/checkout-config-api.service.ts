import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, map } from 'rxjs';

import { environment } from '../../../../environments/environment';

export interface TransferCheckoutConfig {
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_name: string;
  holder_id: string | null;
  qr_image_url: string | null;
  instructions: string | null;
}

export interface PayPalCheckoutConfig {
  enabled: boolean;
  client_id: string;
  currency: string;
  locale: string;
}

interface LegacyCheckoutConfig {
  transfer: TransferCheckoutConfig | null;
  paypal: PayPalCheckoutConfig;
}

interface PublicBusinessSettings {
  business: {
    name: string;
    phone: string | null;
    email: string | null;
    address: string | null;
  };

  store: {
    accepts_orders: boolean;
    closed_message: string | null;
    estimated_minutes: number;
    currency: string;
    timezone: string;
  };

  delivery: {
    pickup_enabled: boolean;
    delivery_enabled: boolean;
    delivery_fee: number;
    minimum_order: number;
  };

  payments: {
    paypal_enabled: boolean;
    transfer_enabled: boolean;
    cash_enabled: boolean;
  };

  whatsapp: {
    active: boolean;
    phone: string | null;
  };
}

interface ApiResponse<T> {
  data: T;
}

export interface CheckoutConfig {
  business: PublicBusinessSettings['business'];
  store: PublicBusinessSettings['store'];
  delivery: PublicBusinessSettings['delivery'];
  payments: PublicBusinessSettings['payments'];
  whatsapp: PublicBusinessSettings['whatsapp'];
  transfer: TransferCheckoutConfig | null;
  paypal: PayPalCheckoutConfig;
}

export interface CheckoutConfigResponse {
  data: CheckoutConfig;
}

@Injectable({
  providedIn: 'root',
})
export class CheckoutConfigApiService {
  private readonly http = inject(HttpClient);
  private readonly apiBase = environment.apiUrl.replace(/\/+$/, '');

  getConfig(): Observable<CheckoutConfigResponse> {
    return forkJoin({
      checkout: this.http.get<ApiResponse<LegacyCheckoutConfig>>(
        `${this.apiBase}/v1/public/checkout/config`,
      ),

      settings: this.http.get<ApiResponse<PublicBusinessSettings>>(
        `${this.apiBase}/v1/public/settings`,
      ),
    }).pipe(
      map(({ checkout, settings }) => ({
        data: {
          ...settings.data,
          transfer: checkout.data.transfer,
          paypal: {
            ...checkout.data.paypal,
            enabled:
              checkout.data.paypal.enabled &&
              settings.data.payments.paypal_enabled,
          },
        },
      })),
    );
  }
}
