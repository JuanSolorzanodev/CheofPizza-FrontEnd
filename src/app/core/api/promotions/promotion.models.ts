export interface ApiResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
}

export type PromotionType =
  | 'fixed_combo'
  | 'size_fixed_price';

export interface PromotionSizeDto {
  id: number;
  name: string;
  portion?: number | null;
}

export interface PromotionCategoryDto {
  id: number;
  name: string;
}

export interface PromotionDetailDto {
  id?: number;
  required_quantity: number;
  category: PromotionCategoryDto | null;
  size: PromotionSizeDto | null;
}

export interface PromotionSizePriceDto {
  id: number;
  size_id: number;
  price: number;
  size: PromotionSizeDto | null;
}

export interface PromotionSelectionRulesDto {
  type: PromotionType;

  allows_extras: boolean;

  allows_remove_ingredients: boolean;

  allows_half_and_half: boolean;

  allows_any_category: boolean;

  requires_size_selection: boolean;

  selection_count: number;

  max_extras_per_pizza: number;

  allow_duplicate_ingredients_as_extra: boolean;
}

export interface PromotionDto {
  id: number;

  slug: string;

  name: string;

  description: string | null;

  banner_image_url: string | null;

  type: PromotionType;

  /**
   * En fixed_combo contiene el precio total.
   * En size_fixed_price normalmente viene en cero
   * porque el precio se obtiene desde size_prices.
   */
  price: number;

  starts_at: string | null;

  ends_at: string | null;

  details: PromotionDetailDto[];

  size_prices: PromotionSizePriceDto[];

  selection_rules: PromotionSelectionRulesDto;
}
