export interface AdminPromotionsApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export type AdminPromotionType =
  | 'fixed_combo'
  | 'size_fixed_price';

export type AdminPromotionStatus =
  | 'active'
  | 'scheduled'
  | 'finished'
  | 'inactive';

export interface AdminPromotionCategory {
  id: number;
  name: string;
}

export interface AdminPromotionSize {
  id: number;
  name: string;
  portion: number;
}

export interface AdminPromotionDetail {
  id: number;
  category_id: number;
  size_id: number;
  required_quantity: number;
  category: AdminPromotionCategory | null;
  size: AdminPromotionSize | null;
}

export interface AdminPromotionSizePrice {
  id: number;
  size_id: number;
  price: number;
  size: AdminPromotionSize | null;
}

export interface AdminPromotionUsage {
  cart_items: number;
  order_items: number;
  total: number;
}

export interface AdminPromotion {
  id: number;
  name: string;
  slug: string;
  description: string | null;
  banner_image_url: string | null;
  type: AdminPromotionType;
  selection_quantity: number;
  price: number;
  starts_at: string | null;
  ends_at: string | null;
  is_active: boolean;
  status: AdminPromotionStatus;
  details: AdminPromotionDetail[];
  size_prices: AdminPromotionSizePrice[];
  usage: AdminPromotionUsage;
  can_delete: boolean;
  can_activate: boolean;
}

export interface AdminPromotionDetailPayload {
  category_id: number;
  size_id: number;
  required_quantity: number;
}

export interface AdminPromotionSizePricePayload {
  size_id: number;
  price: number;
}

export interface AdminPromotionPayload {
  name: string;
  slug: string;
  description: string | null;
  banner_image_url: string | null;
  type: AdminPromotionType;
  selection_quantity: number;
  price: number | null;
  starts_at: string;
  ends_at: string;
  is_active: boolean;
  details: AdminPromotionDetailPayload[];
  size_prices: AdminPromotionSizePricePayload[];
}

export interface AdminPromotionVisibilityPayload {
  is_active: boolean;
}

export interface AdminPromotionValidationErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}

export interface AdminPromotionStatusOption {
  label: string;
  value: AdminPromotionStatus | 'all';
}

export interface AdminPromotionTypeOption {
  label: string;
  value: AdminPromotionType | 'all';
}

export interface AdminPromotionFormTypeOption {
  label: string;
  value: AdminPromotionType;
  description: string;
}
