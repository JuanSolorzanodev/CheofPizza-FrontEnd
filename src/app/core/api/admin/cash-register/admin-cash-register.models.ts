export type CashSessionStatus = 'open' | 'closed';

export type CashMovementType = 'income' | 'expense';

export interface CashUserReference {
  id: number | null;
  name: string | null;
}

export interface CashSession {
  uuid: string;
  status: CashSessionStatus;

  opening_amount: number;
  expected_cash: number | null;
  counted_cash: number | null;
  difference: number | null;

  opened_at: string | null;
  closed_at: string | null;

  opening_note: string | null;
  closing_note: string | null;

  opened_by: CashUserReference;
  closed_by: CashUserReference | null;
}

export interface CashMovement {
  uuid: string;
  type: CashMovementType;
  amount: number;
  reason: string;
  occurred_at: string | null;
  created_by: CashUserReference;
}

export interface CashSessionSummary {
  session: {
    uuid: string;
    status: CashSessionStatus;

    opened_at: string | null;
    closed_at: string | null;

    opened_by: CashUserReference;
    closed_by: CashUserReference | null;
  };

  /**
   * Dinero físico que debe existir en el cajón.
   */
  amounts: {
    opening_amount: number;
    cash_sales: number;
    manual_income: number;
    manual_expense: number;
    expected_cash: number;
    counted_cash: number | null;
    difference: number | null;
  };

  /**
   * Recaudación comercial reconocida durante la sesión.
   *
   * Incluye efectivo, transferencias aprobadas
   * y pagos PayPal completados.
   */
  collections: {
    total_collected: number;

    cash: {
      amount: number;
      transactions: number;
    };

    transfer: {
      amount: number;
      transactions: number;
    };

    paypal: {
      amount: number;
      transactions: number;
    };
  };

  activity: {
    cash_orders: number;
    transfer_orders: number;
    paypal_payments: number;
    collected_transactions: number;

    income_movements: number;
    expense_movements: number;
    movements_total: number;
  };
}

export interface CashOrder {
  id: number;
  order_number: string;
  total: number;
  ordered_at: string | null;
  delivered_at: string | null;

  customer: {
    id: number;
    name: string;
    email: string | null;
    phone: string | null;
  };
}

export interface CashSessionDetail {
  session: CashSession;
  summary: CashSessionSummary;
  cash_orders: CashOrder[];
  movements: CashMovement[];
}

export interface OpenCashSessionPayload {
  opening_amount: number;
  opening_note?: string | null;
}

export interface CloseCashSessionPayload {
  counted_cash: number;
  closing_note?: string | null;
}

export interface StoreCashMovementPayload {
  type: CashMovementType;
  amount: number;
  reason: string;
}

export interface CashSessionHistoryFilters {
  date_from?: string | null;
  date_to?: string | null;
  status?: CashSessionStatus | null;
  page?: number;
  per_page?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PaginationMeta {
  current_page: number;
  per_page: number;
  last_page: number;
  total: number;
  from: number | null;
  to: number | null;
}

export interface PaginatedApiResponse<T> extends ApiResponse<T> {
  meta: PaginationMeta;
}

export interface ApiValidationErrorResponse {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
