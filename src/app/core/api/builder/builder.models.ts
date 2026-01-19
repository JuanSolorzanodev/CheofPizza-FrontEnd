export type AppliesTo = 'ALL' | 'A' | 'B';

export interface BuilderQuoteRequestDto {
  pizza_id: number;
  is_half_and_half: boolean;
  second_pizza_id?: number | null;
  size_id: number;
  quantity: number;
  extras: Array<{
    ingredient_id: number;
    applies_to: AppliesTo;
  }>;
}

export interface BuilderQuoteResponseDto {
  pizza_a: { id: number; name: string };
  pizza_b: { id: number; name: string } | null;

  size_id: number;
  quantity: number;

  base_price_a: number;
  base_price_b: number;
  base_price: number;

  extras_total: number;
  unit_price: number;
  total: number;

  extras_breakdown: Array<{
    ingredient_id: number;
    ingredient_name: string;
    applies_to: AppliesTo;
    size_id: number;
    unit_extra_price: number;
    multiplier: number;
    line_total: number;
  }>;
}

export interface ApiResponse<T> {
  data: T;
}
