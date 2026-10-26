import { EventType, Product, RecommendationResponse, SearchResponse } from "./types";

// No user signup/login exists in this design (out of scope, per readme.txt).
// A single seeded test user stands in for "the logged-in buyer" throughout
// this storefront - see readme.txt's seed step.
export const TEST_USER_ID = "33333333-3333-3333-3333-333333333333";

export interface SearchParams {
  q?: string;
  category?: string;
  sellerIds?: string[];
  minPrice?: number;
  maxPrice?: number;
  minRating?: number;
  sortBy?: "relevance" | "price_asc" | "price_desc";
  page?: number;
  limit?: number;
}

export async function searchProducts(params: SearchParams): Promise<SearchResponse> {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.category) qs.set("category", params.category);
  if (params.sellerIds && params.sellerIds.length > 0) qs.set("sellerId", params.sellerIds.join(","));
  if (params.minPrice !== undefined) qs.set("minPrice", String(params.minPrice));
  if (params.maxPrice !== undefined) qs.set("maxPrice", String(params.maxPrice));
  if (params.minRating !== undefined) qs.set("minRating", String(params.minRating));
  if (params.sortBy) qs.set("sortBy", params.sortBy);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 20));

  const res = await fetch(`/products/search?${qs.toString()}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `search failed with ${res.status}`);
  }
  return res.json();
}

export async function getRecommendations(userId: string, limit = 6): Promise<RecommendationResponse> {
  const res = await fetch(`/recommendations?userId=${userId}&limit=${limit}`);
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `recommendations failed with ${res.status}`);
  }
  return res.json();
}

interface EventInput {
  eventType: EventType;
  productId?: string;
  searchQuery?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Fire-and-forget, per docs/phase3.md and docs/phase11 (user event flow):
 * event collection must never block the user's primary action. Failures
 * are swallowed, not surfaced to the UI.
 */
export function postEvent(event: EventInput): void {
  fetch("/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      eventId: crypto.randomUUID(),
      userId: TEST_USER_ID,
      timestamp: new Date().toISOString(),
      ...event,
    }),
  }).catch((err) => {
    console.warn("[events] failed to record event (non-blocking):", err);
  });
}

export function formatPrice(price: number): string {
  return `₹${Math.round(price).toLocaleString("en-IN")}`;
}

export type { Product };
