export interface ApiResponse<T> { data: T; }

export type DeliveryTypeCode = 'pickup' | 'delivery';
export type PaymentMethodCode = 'cash' | 'transfer' | 'card';

export interface CheckoutRequestDto {
  delivery_type: DeliveryTypeCode;
  payment_method: PaymentMethodCode;
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
  payment_method: string;
  status: string;
  items: OrderItemDto[];
}
