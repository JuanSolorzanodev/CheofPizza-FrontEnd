export interface ApiResponse<T> { data: T; }

export type DeliveryTypeCode = 'pickup' | 'delivery';
export type PaymentMethodCode = 'cash' | 'transfer' | 'card';

export interface DeliveryLocationDto {
  lat: number;
  lng: number;
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
  name: string;
}

export interface OrderPromotionDto {
  id: number;
  name: string;
}

export interface OrderItemDto {
  id: number;
  item_type: 'pizza' | 'promotion';
  is_half_and_half: boolean;

  promotion?: OrderPromotionDto | null;
  selected_pizzas?: OrderSelectedPizzaDto[];

  pizza: { id: number; name: string; category: string } | null;
  pizza_second: { id: number; name: string; category: string } | null;
  size: { id: number; name: string } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  extras: any[];
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
  from?: string | null;
  to: string;
  changed_at: string;
  note?: string | null;
}

export interface OrderDto {
  id: number;
  order_number: string;
  ordered_at: string;
  total: number;

  delivery_type: string;
  address: string | null;
  delivery_location?: DeliveryLocationDto | null;

  payment_method: string;
  status: string;

  whatsapp_receipt_url?: string | null;

  items: OrderItemDto[];

  transfer_account?: TransferAccountDto | null;
  payment_hint?: string | null;
  status_changes?: OrderStatusChangeDto[];
}
