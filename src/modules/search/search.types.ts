export type SortBy = "price_asc" | "price_desc" | "relevance";

export interface SearchQuery {
  q?: string;
  category?: string;
  sellerId?: string;
  minPrice?: number;
  maxPrice?: number;
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
  createdAt: Date;
  updatedAt: Date;
}

export interface SearchResponse {
  results: SearchResultItem[];
  page: number;
  limit: number;
  total: number;
}
