import { NotFoundError } from "../../errors";
import * as productRepository from "./product.repository";
import { ProductWithInventory } from "./product.types";

export async function getProductById(productId: string): Promise<ProductWithInventory> {
  const product = await productRepository.findProductById(productId);
  if (!product) {
    throw new NotFoundError("product not found");
  }
  return product;
}
