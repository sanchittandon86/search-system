import { BadRequestError, ConflictError, NotFoundError } from "../../errors";
import * as inventoryRepository from "./inventory.repository";
import { Inventory, InventoryUpdateInput } from "./inventory.types";

export async function updateInventory(productId: string, input: InventoryUpdateInput): Promise<Inventory> {
  const hasQuantity = input.quantity !== undefined;
  const hasDelta = input.delta !== undefined;

  if (hasQuantity === hasDelta) {
    throw new BadRequestError("exactly one of quantity or delta must be provided");
  }

  if (hasQuantity) {
    if (input.quantity! < 0) {
      throw new BadRequestError("quantity must be >= 0");
    }
    const updated = await inventoryRepository.setQuantity(productId, input.quantity!);
    if (!updated) {
      throw new NotFoundError("product not found in inventory");
    }
    return updated;
  }

  const found = await inventoryRepository.exists(productId);
  if (!found) {
    throw new NotFoundError("product not found in inventory");
  }

  const updated = await inventoryRepository.adjustQuantity(productId, input.delta!);
  if (!updated) {
    throw new ConflictError("insufficient stock");
  }
  return updated;
}
