import { Request, Response } from "express";
import * as inventoryService from "./inventory.service";

export async function updateInventory(req: Request, res: Response) {
  const { productId } = req.params;
  const inventory = await inventoryService.updateInventory(productId, req.body);
  res.status(200).json(inventory);
}
