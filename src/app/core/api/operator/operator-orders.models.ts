import { PaymentReceiptDto } from '../payments/payment-receipts/payment-receipt.models';

export type DeliveryType = 'delivery' | 'pickup' | string;

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'paypal' | string;

export type OrderStatusName =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled';

export interface ApiResource<T> {
  data: T;
}

export interface ApiPaginationMeta {
  total?: number;
  per_page?: number;
  current_page?: number;
  last_page?: number;
  from?: number | null;
  to?: number | null;
  path?: string;
}

export interface ApiPaginationLinks {
  first?: string | null;
  last?: string | null;
  prev?: string | null;
  next?: string | null;
}

export interface ApiPaginated<T> {
  data: T[];
  meta?: ApiPaginationMeta;
  links?: ApiPaginationLinks | unknown;
}

export interface OperatorOrdersFilters {
  page?: number;
  per_page?: number;
  q?: string;
  status?: string;
  delivery_type?: string;
  payment_method?: string;
  date_from?: string;
  date_to?: string;
}

export interface OperatorOrderCustomerSummary {
  name: string;
  phone: string;
}

export interface OperatorOrderListDto {
  id: number;
  order_number: string;
  ordered_at: string | null;
  total: number;

  status: OrderStatusName | string;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;

  customer: OperatorOrderCustomerSummary | null;

  kitchen_summary: string;
}

export interface OperatorOrderDetailDto {
  id: number;
  order_number: string;
  ordered_at: string | null;
  total: number;

  status: OrderStatusName | string;

  allowed_transitions: Array<OrderStatusName | string>;

  delivery_type: DeliveryType;
  payment_method: PaymentMethod;

  customer: {
    id: number;
    name: string;
    phone: string;
    email?: string;
  } | null;

  delivery: {
    address: string | null;
    lat: number | null;
    lng: number | null;
    maps_url?: string | null;
    reference?: string | null;
  } | null;

  customer_confirmation_whatsapp_url?: string | null;

  delivery_whatsapp_url?: string | null;

  payment_receipt: PaymentReceiptDto | null;

  kitchen: {
    items: KitchenItemDto[];
  };

  status_changes?: OperatorStatusChangeDto[];
}

export interface OperatorStatusChangeDto {
  from: string | null;
  to: string | null;
  changed_at: string | null;
  note: string | null;
  by?: string | null;

  changed_by?: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export type KitchenItemType = 'pizza' | 'half_and_half' | 'promotion';

export interface KitchenPromotionPizzaDto {
  /**
   * ID real de order_promotion_items.
   *
   * El backend puede devolverlo como "id".
   */
  id: number;

  pizza_id: number;
  pizza_name: string;
  ingredients: string[];
}

export interface KitchenPersonalizationDto {
  id: number;

  /**
   * Si pertenece a una pizza específica de una promoción,
   * contiene el ID de order_promotion_items.
   *
   * Para pizzas normales será null.
   */
  order_promotion_item_id: number | null;

  ingredient_id: number;
  ingredient_name: string;
  action: string;

  applies_to:
    | 'ALL'
    | 'A'
    | 'B'
    | string;

  extra_price: number;
}

export interface KitchenItemDto {
  id: number;
  quantity: number;
  size_name: string;
  category_name?: string;
  type: KitchenItemType;

  pizza?: {
    pizza_id: number;
    pizza_name: string;
    ingredients: string[];
  };

  half?: {
    A: {
      pizza_id: number;
      pizza_name: string;
      ingredients: string[];
    };

    B: {
      pizza_id: number;
      pizza_name: string;
      ingredients: string[];
    };
  };

  promotion?: {
    id: number;
    name: string;

    pizzas: KitchenPromotionPizzaDto[];
  };

  personalizations?: KitchenPersonalizationDto[];
}

export interface QueueCountsDto {
  [statusName: string]: number;
}

export interface OperatorQueueResponse {
  data: QueueCountsDto;
}

export interface OperatorStatusesResponse {
  data: string[];
}
