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

  // ya no dependemos de address string
  delivery_location?: DeliveryLocationDto | null;

  // lo dejamos opcional por compatibilidad (no lo usaremos como principal)
  address?: string | null;

  notes?: string | null;
}

export interface OrderItemDto {
  id: number;
  is_half_and_half: boolean;
  pizza: { id: number; name: string; category: string } | null;
  pizza_second: { id: number; name: string; category: string } | null;
  size: { id: number; name: string } | null;
  quantity: number;
  unit_price: number;
  subtotal: number;
  extras: any[];
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
}

