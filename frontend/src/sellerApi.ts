import { Product } from "./types";

// No seller signup/login exists in this design (out of scope, per readme.txt).
// The seeded "Test Seller" stands in for "the logged-in seller" throughout
// this dashboard - see readme.txt's seed step.
export const TEST_SELLER_ID = "11111111-1111-1111-1111-111111111111";

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

export async function listSellerProducts(page = 1, limit = 50): Promise<SellerProductsResponse> {
  const res = await fetch(`/sellers/${TEST_SELLER_ID}/products?page=${page}&limit=${limit}`);
  return parseOrThrow(res);
}

export interface CreateProductInput {
  name: string;
  description?: string;
  categoryId?: string;
  price: number;
  quantity?: number;
}

export async function createProduct(input: CreateProductInput): Promise<Product> {
  const res = await fetch(`/sellers/${TEST_SELLER_ID}/products`, {
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

export async function updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
  const res = await fetch(`/sellers/${TEST_SELLER_ID}/products/${productId}`, {
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
