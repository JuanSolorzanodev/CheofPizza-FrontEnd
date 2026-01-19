import type { AppliesTo, BuilderQuoteRequestDto } from '../builder/builder.models';

export type CartAddPizzaRequestDto = BuilderQuoteRequestDto;

export interface ApiResponse<T> {
  data: T;
}

export interface CartItemDto {
  id: number;
  item_type: 'pizza';
  is_half_and_half: boolean;

  pizza?: { id: number; name: string; image_url: string | null; category?: string | null };
  pizza_second?: { id: number; name: string; image_url: string | null; category?: string | null } | null;

  size?: { id: number; name: string; portion?: number | null };

  quantity: number;
  unit_price: number;
  subtotal: number;

  extras?: Array<{
    id: number;
    ingredient: { id: number; name: string };
    action: { id: number; name: string };
    applies_to: AppliesTo;
    extra_price: number;
  }>;
}

export interface CartDto {
  id: number;
  session_id: string;
  user_id: number | null;
  status: string;
  total_units: number;
  total: number;
  items: CartItemDto[];
}
