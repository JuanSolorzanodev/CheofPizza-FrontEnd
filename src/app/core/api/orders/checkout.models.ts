export interface ApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

export type DeliveryTypeCode = 'pickup' | 'delivery';
export type PaymentMethodCode = 'cash' | 'transfer' | 'card';
export type OrderStatusCode =
  | 'pending'
  | 'confirmed'
  | 'preparing'
  | 'ready'
  | 'on_the_way'
  | 'delivered'
  | 'cancelled'
  | 'canceled';

export interface DeliveryLocationDto {
  lat: number | null;
  lng: number | null;
  maps_url?: string | null;
  place_id?: string | null;
  reference?: string | null;
  formatted_address?: string | null;
}

export interface CheckoutRequestDto {
  delivery_type: DeliveryTypeCode;
  payment_method: PaymentMethodCode;
  delivery_location?: DeliveryLocationDto | null;
  address?: string | null;
  notes?: string | null;
}

export interface OrderSelectedPizzaDto {
  id: number;
  pizza_id?: number | null;
  name?: string | null;
  pizza_name?: string | null;
}

export interface OrderPromotionDto {
  id: number;
  name: string;
}

export interface OrderPersonalizationDto {
  id: number;
  order_promotion_item_id?: number | null;
  ingredient_id?: number | null;
  ingredient_name?: string | null;
  action_id?: number | null;
  action?: string | null;
  applies_to?: string | null;
  modification_type?: string | null;
  extra_price?: number;
}

export interface OrderItemDto {
  id: number;
  item_type: 'pizza' | 'promotion';
  is_half_and_half: boolean;
  promotion?: OrderPromotionDto | null;
  selected_pizzas?: OrderSelectedPizzaDto[];
  pizza: { id: number; name: string; category: string | null } | null;
  pizza_second: { id: number; name: string; category: string | null } | null;
  size: { id: number; name: string } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  personalizations?: OrderPersonalizationDto[];
  extras?: unknown[];
}

export interface TransferAccountDto {
  bank_name: string;
  account_type: string;
  account_number: string;
  holder_name: string;
  holder_id?: string | null;
  qr_image_url?: string | null;
  instructions?: string | null;
}

export interface OrderStatusChangeDto {
  id?: number;
  from_status?: string | null;
  to_status?: string | null;
  from?: string | null;
  to?: string | null;
  changed_at: string;
  note?: string | null;
  changed_by?: {
    id: number;
    name: string;
  } | null;
}

export interface OrderCustomerDto {
  id: number;
  name: string;
  email?: string | null;
  phone?: string | null;
}

export interface OrderPaymentDto {
  id: number;
  uuid?: string | null;
  provider?: string | null;
  status?: string | null;
  amount: number;
  currency: string;
  paypal_order_id?: string | null;
  paypal_capture_id?: string | null;
  approved_at?: string | null;
  paid_at?: string | null;
  failed_at?: string | null;
  cancelled_at?: string | null;
  refunded_at?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
}

export interface OrderDto {
  id: number;
  order_number: string;
  ordered_at: string;
  subtotal: number;
  delivery_fee: number;
  total: number;
  currency?: string;
  delivery_type: DeliveryTypeCode | string;
  address: string | null;
  delivery_location?: DeliveryLocationDto | null;
  payment_method: PaymentMethodCode | string;
  payment?: OrderPaymentDto | null;
  status: OrderStatusCode | string;
  customer?: OrderCustomerDto | null;
  whatsapp_receipt_url?: string | null;
  items: OrderItemDto[];
  items_count?: number | null;
  transfer_account?: TransferAccountDto | null;
  payment_hint?: string | null;
  status_changes?: OrderStatusChangeDto[];
  created_at?: string | null;
  updated_at?: string | null;
}
