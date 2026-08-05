export interface AdminApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminAnalyticsDateRangeFilters {
  date_from?: string | null;
  date_to?: string | null;
  timezone?: string;
}

export interface AdminAnalyticsPeriod {
  date_from: string;
  date_to: string;
  timezone: string;
  days: number;
}

/*
|--------------------------------------------------------------------------
| Resumen comercial
|--------------------------------------------------------------------------
*/

export interface AdminSalesSummary {
  gross_sales: number;
  refunds: number;
  net_sales: number;

  delivered_orders: number;
  cancelled_orders: number;

  pizzas_sold: number;
  promotions_sold: number;

  average_ticket: number;
  cancellation_rate: number;
}

export interface AdminSalesComparison {
  period: AdminAnalyticsPeriod;

  net_sales_percentage: number | null;

  delivered_orders_percentage:
    number | null;

  pizzas_sold_percentage:
    number | null;

  average_ticket_percentage:
    number | null;
}

export interface AdminSalesDashboardData {
  period: AdminAnalyticsPeriod;

  summary: AdminSalesSummary;

  comparison: AdminSalesComparison;

  previous_summary:
    AdminSalesSummary;
}

/*
|--------------------------------------------------------------------------
| Ventas diarias
|--------------------------------------------------------------------------
*/

export interface AdminDailySalesItem {
  date: string;

  gross_sales: number;
  refunds: number;
  net_sales: number;

  delivered_orders: number;
  cancelled_orders: number;

  pizzas_sold: number;
  promotions_sold: number;

  average_ticket: number;
  cancellation_rate: number;
}

export interface AdminDailySalesTotals {
  gross_sales: number;
  refunds: number;
  net_sales: number;

  delivered_orders: number;
  cancelled_orders: number;

  pizzas_sold: number;
  promotions_sold: number;

  average_ticket: number;
  cancellation_rate: number;
}

export interface AdminDailySalesData {
  period: AdminAnalyticsPeriod;

  totals: AdminDailySalesTotals;

  days: AdminDailySalesItem[];
}

/*
|--------------------------------------------------------------------------
| Ventas por hora
|--------------------------------------------------------------------------
*/

export interface AdminHourlySalesItem {
  hour: number;
  label: string;

  gross_sales: number;
  refunds: number;
  net_sales: number;

  delivered_orders: number;
  cancelled_orders: number;

  pizzas_sold: number;
  promotions_sold: number;

  average_ticket: number;
  cancellation_rate: number;
}

export interface AdminHourlySalesSummary {
  gross_sales: number;
  net_sales: number;

  delivered_orders: number;
  cancelled_orders: number;

  pizzas_sold: number;
  promotions_sold: number;

  average_ticket: number;

  peak_sales_hour: number | null;
  peak_sales_hour_label: string | null;
  peak_sales_amount: number;

  peak_orders_hour: number | null;
  peak_orders_hour_label: string | null;
  peak_orders_count: number;
}

export interface AdminHourlySalesData {
  period: AdminAnalyticsPeriod;

  summary: AdminHourlySalesSummary;

  hours: AdminHourlySalesItem[];
}

/*
|--------------------------------------------------------------------------
| Productos
|--------------------------------------------------------------------------
*/

export interface AdminPizzaPerformanceItem {
  pizza_id: number | null;
  pizza_name: string;

  equivalent_units: number;
  complete_units: number;
  half_units: number;
  promotion_units: number;
}

export interface AdminPromotionPerformanceItem {
  promotion_id: number | null;
  promotion_name: string;

  packages_sold: number;
  gross_sales: number;
}

export interface AdminSizePerformanceItem {
  size_id: number | null;
  size_name: string;

  pizza_units: number;
}

export interface AdminProductPerformanceSummary {
  total_pizza_units: number;
  unique_pizzas_sold: number;

  total_promotion_packages: number;
  promotion_gross_sales: number;

  top_pizza:
    AdminPizzaPerformanceItem | null;

  top_promotion:
    AdminPromotionPerformanceItem | null;

  top_size:
    AdminSizePerformanceItem | null;
}

export interface AdminProductPerformanceData {
  period: AdminAnalyticsPeriod;

  summary:
    AdminProductPerformanceSummary;

  pizzas:
    AdminPizzaPerformanceItem[];

  promotions:
    AdminPromotionPerformanceItem[];

  sizes:
    AdminSizePerformanceItem[];
}

/*
|--------------------------------------------------------------------------
| Pagos
|--------------------------------------------------------------------------
*/

export interface AdminPaymentMethodAnalytics {
  method:
    | 'cash'
    | 'transfer'
    | 'paypal';

  label: string;

  amount: number;

  orders?: number;
  payments?: number;
}

export interface AdminPaymentPendingMetric {
  amount: number;
  transactions: number;
}

export interface AdminPaymentPendingData
  extends AdminPaymentPendingMetric {
  transfer:
    AdminPaymentPendingMetric;

  paypal:
    AdminPaymentPendingMetric;
}

export interface AdminPaymentRefunds {
  refunded_payments: number;

  partially_refunded_payments:
    number;

  refundable_amount_available:
    boolean;
}

export interface AdminPaymentSummary {
  collected_total: number;

  cash_amount: number;
  transfer_amount: number;
  paypal_amount: number;

  cash_orders: number;
  transfer_orders: number;
  paypal_payments: number;

  pending_amount: number;
  pending_transactions: number;

  refunded_payments: number;

  partially_refunded_payments:
    number;
}

export interface AdminPaymentAnalyticsData {
  period: AdminAnalyticsPeriod;

  summary: AdminPaymentSummary;

  methods:
    AdminPaymentMethodAnalytics[];

  pending:
    AdminPaymentPendingData;

  refunds:
    AdminPaymentRefunds;
}

/*
|--------------------------------------------------------------------------
| Resultado conjunto
|--------------------------------------------------------------------------
*/

export interface AdminDashboardAnalyticsBundle {
  dashboard:
    AdminSalesDashboardData;

  daily:
    AdminDailySalesData;

  hourly:
    AdminHourlySalesData;

  products:
    AdminProductPerformanceData;

  payments:
    AdminPaymentAnalyticsData;
}

export interface AdminApiValidationError {
  success?: boolean;
  message?: string;
  errors?: Record<string, string[]>;
}
