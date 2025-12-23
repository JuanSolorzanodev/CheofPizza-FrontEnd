export interface ApiCollectionResponse<T> {
  data: T[];
}

export interface SizeDto {
  id: number;
  name: string;
  portion: number;
}

export interface CategorySizePriceDto {
  size: SizeDto;
  price: number;
}

export interface CategoryDto {
  id: number;
  name: string;
  description: string | null;
  size_prices: CategorySizePriceDto[];
}

export interface PizzaDto {
  id: number;
  name: string;
  description: string | null;
  image_url: string | null;
  category: CategoryDto;
}

export interface IngredientTypeDto {
  id: number;
  name: string;
}

export interface IngredientExtraPriceDto {
  size: SizeDto;
  extra_price: number;
}

export interface IngredientDto {
  id: number;
  name: string;
  type?: IngredientTypeDto;
  extra_prices?: IngredientExtraPriceDto[];
}
