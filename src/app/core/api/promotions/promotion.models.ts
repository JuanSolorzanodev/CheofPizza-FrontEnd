export interface ApiResponse<T> {
  data: T;
}

export interface ApiCollectionResponse<T> {
  data: T[];
}

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
  id: number;
  required_quantity: number;
  category: PromotionCategoryDto | null;
  size: PromotionSizeDto | null;
}

export interface PromotionSelectionRulesDto {
  type: 'fixed_combo' | string;
  allows_extras: boolean;
  allows_half_and_half: boolean;
  selection_count: number;
}

export interface PromotionDto {
  id: number;
  slug: string;
  name: string;
  description: string | null;
  banner_image_url: string | null;
  price: number;
  starts_at?: string | null;
  ends_at?: string | null;
  details: PromotionDetailDto[];
  selection_rules: PromotionSelectionRulesDto;
}
