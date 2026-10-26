export interface Product {
  productId: string;
  sellerId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  isActive: boolean;
  quantity: number;
  createdAt: string;
  updatedAt: string;
}

export interface SearchResponse {
  results: Product[];
  page: number;
  limit: number;
  total: number;
}

export interface RecommendationResponse {
  recommendations: Product[];
  source: "personalized" | "fallback";
}

export type EventType =
  | "PRODUCT_VIEWED"
  | "PRODUCT_CLICKED"
  | "SEARCH_PERFORMED"
  | "ADD_TO_CART"
  | "REMOVE_FROM_CART"
  | "WISHLISTED"
  | "PURCHASED";

export interface CartItem {
  product: Product;
  quantity: number;
}
