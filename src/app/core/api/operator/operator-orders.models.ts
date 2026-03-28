export type DeliveryType = 'delivery' | 'pickup' | string;
export type PaymentMethod = 'cash' | 'transfer' | 'card' | string;

export interface ApiResource<T> {
  data: T;
}

export interface ApiPaginated<T> {
  data: T[];
  meta?: { total?: number; per_page?: number; current_page?: number };
  links?: any;
}

// -------------------------
// LIST (liviano + summary)
// -------------------------
export interface OperatorOrderListDto {
  id: number;
  order_number: string;
  ordered_at: string | null;
  total: number;

  status: string;
  delivery_type: DeliveryType;
  payment_method: PaymentMethod;

  customer: {
    name: string;
    phone: string;
  } | null;

  kitchen_summary: string;
}

// -------------------------
// DETAIL (Kitchen ticket)
// -------------------------
export interface OperatorOrderDetailDto {
  id: number;
  order_number: string;
  ordered_at: string | null;
  total: number;

  status: string;
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

  delivery_whatsapp_url?: string | null;

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
  changed_by?: { id: number; name: string; email: string } | null;
}

// -------------------------
// Kitchen Ticket models
// -------------------------
export type KitchenItemType = 'pizza' | 'half_and_half' | 'promotion';

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
    A: { pizza_id: number; pizza_name: string; ingredients: string[] };
    B: { pizza_id: number; pizza_name: string; ingredients: string[] };
  };

  promotion?: {
    id: number;
    name: string;
    pizzas: { pizza_id: number; pizza_name: string; ingredients: string[] }[];
  };

  personalizations?: KitchenPersonalizationDto[];
}

export interface KitchenPersonalizationDto {
  ingredient_id: number;
  ingredient_name: string;
  action: string;
  applies_to: 'ALL' | 'A' | 'B' | string;
  extra_price: number;
}

export interface QueueCountsDto {
  [statusName: string]: number;
}
