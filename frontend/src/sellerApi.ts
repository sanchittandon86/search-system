import { EventType, ListEventsResponse, Product } from "./types";

export interface Seller {
  sellerId: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
}

export interface SellerProductsResponse {
  products: Product[];
  page: number;
  limit: number;
  total: number;
}

async function parseOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `request failed with ${res.status}`);
  }
  return res.json();
}

export async function listSellers(): Promise<Seller[]> {
  const res = await fetch(`/sellers`);
  const body = await parseOrThrow<{ sellers: Seller[] }>(res);
  return body.sellers;
}

export async function listSellerProducts(sellerId: string, page = 1, limit = 50): Promise<SellerProductsResponse> {
  const res = await fetch(`/sellers/${sellerId}/products?page=${page}&limit=${limit}`);
  return parseOrThrow(res);
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  quantity?: number;
}

export async function createProduct(sellerId: string, input: CreateProductInput): Promise<Product> {
  const res = await fetch(`/sellers/${sellerId}/products`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res);
}

export interface UpdateProductInput {
  name?: string;
  description?: string;
  categoryId?: string;
  price?: number;
  isActive?: boolean;
}

export async function updateProduct(sellerId: string, productId: string, input: UpdateProductInput): Promise<Product> {
  const res = await fetch(`/sellers/${sellerId}/products/${productId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });
  return parseOrThrow(res);
}

export async function setInventoryQuantity(productId: string, quantity: number): Promise<{ productId: string; quantity: number }> {
  const res = await fetch(`/products/${productId}/inventory`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ quantity }),
  });
  return parseOrThrow(res);
}

export interface ListEventsParams {
  sellerId: string;
  page?: number;
  limit?: number;
  eventType?: EventType;
}

export async function listEvents(params: ListEventsParams): Promise<ListEventsResponse> {
  const qs = new URLSearchParams();
  qs.set("sellerId", params.sellerId);
  qs.set("page", String(params.page ?? 1));
  qs.set("limit", String(params.limit ?? 50));
  if (params.eventType) qs.set("eventType", params.eventType);

  const res = await fetch(`/events?${qs.toString()}`);
  return parseOrThrow(res);
}
