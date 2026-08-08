export interface AdminBusinessSettings {
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
    currency: 'USD';
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
    paypal_configured: boolean;
  };
  whatsapp: {
    active: boolean;
    phone: string | null;
  };
  updated_at: string | null;
}

export interface AdminBusinessSettingsPayload {
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
    currency: 'USD';
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

export interface AdminBusinessSettingsResponse {
  success: boolean;
  message: string;
  data: AdminBusinessSettings;
}

export interface AdminSettingsValidationErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
