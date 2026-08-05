export interface AdminApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface AdminCategorySizePrice {
  id: number;
  category_id: number;
  size_id: number;
  price: number;

  category?: {
    id: number;
    name: string;
  };

  size?: {
    id: number;
    name: string;
    portion: number;
  };

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCategory {
  id: number;
  name: string;
  description: string | null;
  pizzas_count: number;
  prices_count: number;
  size_prices: AdminCategorySizePrice[];
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminSize {
  id: number;
  name: string;
  portion: number;
  category_prices_count: number;
  ingredient_prices_count: number;
  cart_items_count: number;
  order_items_count: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminCategoryPayload {
  name: string;
  description: string | null;
}

export interface AdminSizePayload {
  name: string;
  portion: number;
}

export interface AdminCategoryPricePayload {
  category_id: number;
  size_id: number;
  price: number;
}

export interface AdminUpdateCategoryPricesPayload {
  prices: AdminCategoryPricePayload[];
}

export interface AdminPizzaCategory {
  id: number;
  name: string;
}

export interface AdminPizzaIngredientType {
  id: number;
  name: string;
}

export interface AdminPizzaIngredient {
  id: number;
  name: string;
  type: AdminPizzaIngredientType | null;
}

export interface AdminPizzaUsage {
  cart_items: number;
  cart_items_second: number;
  cart_items_total: number;
  cart_promotions: number;
  order_items: number;
  order_items_second: number;
  order_items_total: number;
  order_promotions: number;
  sales_history: number;
  total: number;
}

export interface AdminPizza {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  category: AdminPizzaCategory;
  ingredients: AdminPizzaIngredient[];
  ingredients_count: number;
  usage: AdminPizzaUsage;
  can_delete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminPizzaPayload {
  category_id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  is_visible: boolean;
  ingredient_ids: number[];
}

export interface AdminPizzaVisibilityPayload {
  is_visible: boolean;
}

export interface AdminIngredientType {
  id: number;
  name: string;
  ingredients_count: number;
  can_delete: boolean;
  created_at: string | null;
  updated_at: string | null;
}

export interface AdminIngredientPriceSize {
  id: number;
  name: string;
  portion: number;
}

export interface AdminIngredientPrice {
  id: number;
  ingredient_id: number;
  size_id: number;
  extra_price: number;

  ingredient?: {
    id: number;
    name: string;
  };

  size: AdminIngredientPriceSize;

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminIngredientUsage {
  pizzas: number;
  prices: number;
  cart_personalizations: number;
  order_personalizations: number;
  total: number;
}

export interface AdminIngredient {
  id: number;
  ingredient_type_id: number;
  name: string;

  type: {
    id: number;
    name: string;
  };

  prices: AdminIngredientPrice[];
  usage: AdminIngredientUsage;
  can_delete: boolean;

  created_at: string | null;
  updated_at: string | null;
}

export interface AdminIngredientTypePayload {
  name: string;
}

export interface AdminIngredientPayload {
  ingredient_type_id: number;
  name: string;
}

export interface AdminIngredientPricePayload {
  size_id: number;
  extra_price: number;
}

export interface AdminUpdateIngredientPricesPayload {
  prices: AdminIngredientPricePayload[];
}

export interface AdminValidationErrorResponse {
  message?: string;
  errors?: Record<string, string[]>;
}
