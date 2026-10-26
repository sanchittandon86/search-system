export type SortBy = "price_asc" | "price_desc" | "relevance";

export interface SearchQuery {
  q?: string;
  category?: string;
  // Multiple brands can be selected at once (checkbox filter) - an empty
  // array means no seller filter applied.
  sellerIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  isActive: boolean;
  sortBy: SortBy;
  page: number;
  limit: number;
}

export interface SearchResultItem {
  productId: string;
  sellerId: string;
  name: string;
  description: string | null;
  categoryId: string | null;
  price: number;
  isActive: boolean;
  quantity: number;
  // Derived from PURCHASED event count (no review/star system exists in
  // this project) - null means zero purchases, i.e. unrated. See
  // search.repository.ts's RATING_CASE_EXPR for the exact thresholds.
  rating: number | null;
  // The raw count the rating above was derived from - exposed so the UI
  // can show an honest "(N purchased)" instead of a fabricated review count.
  purchaseCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  results: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}
