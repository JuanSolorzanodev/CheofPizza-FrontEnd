export type AdminPaymentMethod =
  | 'cash'
  | 'transfer'
  | 'paypal';

export type AdminPaymentTransactionSource =
  | 'order'
  | 'payment_receipt'
  | 'payment';

export type AdminPaymentTransactionStatus =
  | 'collected'
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'created'
  | 'completed'
  | 'denied'
  | 'failed'
  | 'cancelled'
  | 'refunded'
  | 'partially_refunded';

export interface AdminPaymentTransactionCustomer {
  id: number | null;
  name: string;
  email: string | null;
  phone: string | null;
}

export interface AdminPaymentTransaction {
  transaction_key: string;

  source: AdminPaymentTransactionSource;
  source_id: number;

  method: AdminPaymentMethod;
  status: AdminPaymentTransactionStatus;

  amount: number;
  currency: string;

  effective_at: string | null;

  order_id: number | null;
  order_number: string | null;

  customer: AdminPaymentTransactionCustomer;

  reference: string | null;
  receipt_uuid: string | null;
  reviewed_by: string | null;
  failure_code: string | null;
}

export interface AdminPaymentTransactionMetric {
  amount: number;
  transactions: number;
}

export interface AdminPaymentTransactionSummary {
  /**
   * Volumen de todas las operaciones encontradas,
   * incluyendo exitosas, pendientes y no exitosas.
   */
  volume: AdminPaymentTransactionMetric;

  /**
   * Dinero efectivamente reconocido como recaudado.
   */
  collected: AdminPaymentTransactionMetric;

  /**
   * Recaudación exitosa desglosada por método.
   */
  methods: {
    cash: AdminPaymentTransactionMetric;
    transfer: AdminPaymentTransactionMetric;
    paypal: AdminPaymentTransactionMetric;
  };

  /**
   * Operaciones todavía pendientes de resolución.
   */
  pending: AdminPaymentTransactionMetric;

  /**
   * Operaciones rechazadas, fallidas, canceladas
   * o reembolsadas.
   */
  unsuccessful: AdminPaymentTransactionMetric;
}

export interface AdminPaymentTransactionFilters {
  date_from?: string | null;
  date_to?: string | null;
  timezone?: string;

  method?: AdminPaymentMethod | null;

  status?:
    | AdminPaymentTransactionStatus
    | null;

  search?: string | null;

  page?: number;
  per_page?: number;
}

export interface AdminPaymentTransactionPeriod {
  date_from: string;
  date_to: string;
  timezone: string;
}

export interface AdminPaymentTransactionAppliedFilters {
  method: AdminPaymentMethod | null;

  status:
    | AdminPaymentTransactionStatus
    | null;

  search: string | null;
}

export interface AdminPaymentTransactionResponseData {
  period: AdminPaymentTransactionPeriod;

  filters:
    AdminPaymentTransactionAppliedFilters;

  summary:
    AdminPaymentTransactionSummary;

  transactions:
    AdminPaymentTransaction[];
}

export interface AdminApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminPaginationMeta {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface AdminPaginatedApiResponse<T>
  extends AdminApiResponse<T> {
  meta: AdminPaginationMeta;
}

export interface AdminApiValidationError {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
