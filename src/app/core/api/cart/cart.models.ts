import type { AppliesTo, CustomAction, BuilderQuoteRequestDto } from '../builder/builder.models';

export type CartAddPizzaRequestDto = BuilderQuoteRequestDto;

export interface PromotionSelectedItemCustomizationDto {
  action: CustomAction;
  ingredient_id: number;
  applies_to?: AppliesTo;
}

export interface PromotionSelectedItemDto {
  pizza_id: number;
  customizations: PromotionSelectedItemCustomizationDto[];
}

export interface CartAddPromotionRequestDto {
  promotion_id: number;
  quantity?: number;

  // nuevo contrato
  selected_items: PromotionSelectedItemDto[];

  // compatibilidad opcional
  selected_pizza_ids?: number[];
}

export interface ApiResponse<T> {
  data: T;
}

export interface CartSelectedPizzaDto {
  id: number;
  name: string;
  image_url: string | null;
  category?: string | null;
}

export interface CartPromotionDto {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  price: number;
}

export interface CartItemDto {
  id: number;
  item_type: 'pizza' | 'promotion';
  is_half_and_half: boolean;

  promotion?: CartPromotionDto | null;
  selected_pizzas?: CartSelectedPizzaDto[];

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
