export interface Product {
  productId: string;
  sellerId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  isActive: boolean;
  quantity: number;
  // 1-5, derived from PURCHASED event count (no review system exists) -
  // null means zero purchases, i.e. unrated. Only present on search results.
  rating?: number | null;
  // The raw purchase count the rating was derived from. Only present on
  // search results.
  purchaseCount?: number;
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

export interface EventRecord {
  eventId: string;
  userId: string;
  eventType: EventType;
  productId: string | null;
  searchQuery: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface ListEventsResponse {
  events: EventRecord[];
  page: number;
  limit: number;
  total: number;
}
