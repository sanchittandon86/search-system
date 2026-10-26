import { BadRequestError, NotFoundError } from "../../errors";
import * as productRepository from "../product/product.repository";
import { CreateProductInput, ProductWithInventory, UpdateProductInput, Product } from "../product/product.types";
import * as sellerRepository from "./seller.repository";

async function getActiveSellerOrThrow(sellerId: string) {
  const seller = await sellerRepository.findSellerById(sellerId);
  if (!seller) {
    throw new NotFoundError("seller not found");
  }
  if (seller.status !== "ACTIVE") {
    throw new BadRequestError("seller is not active");
  }
  return seller;
}

export async function createProduct(sellerId: string, input: CreateProductInput): Promise<ProductWithInventory> {
  await getActiveSellerOrThrow(sellerId);

  if (!input.name || input.name.trim() === "") {
    throw new BadRequestError("name is required");
  }
  if (input.price === undefined || input.price <= 0) {
    throw new BadRequestError("price must be greater than 0");
  }
  if (input.quantity !== undefined && input.quantity < 0) {
    throw new BadRequestError("quantity must be >= 0");
  }

  return productRepository.insertProductWithInventory(sellerId, input);
}

export async function updateProduct(
  sellerId: string,
  productId: string,
  input: UpdateProductInput
): Promise<Product> {
  await getActiveSellerOrThrow(sellerId);

  const existing = await productRepository.findProductByIdForSeller(sellerId, productId);
  if (!existing) {
    throw new NotFoundError("product not found for this seller");
  }

  if (Object.keys(input).length === 0) {
    throw new BadRequestError("at least one field must be provided");
  }
  if (input.name !== undefined && input.name.trim() === "") {
    throw new BadRequestError("name must not be empty");
  }
  if (input.price !== undefined && input.price <= 0) {
    throw new BadRequestError("price must be greater than 0");
  }

  return productRepository.updateProduct(productId, input);
}

export async function listSellerProducts(
  sellerId: string,
  page: number,
  limit: number
): Promise<{ products: ProductWithInventory[]; page: number; limit: number; total: number }> {
  await getActiveSellerOrThrow(sellerId);

  const { products, total } = await productRepository.listProductsBySeller(sellerId, page, limit);
  return { products, page, limit, total };
}
