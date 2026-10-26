import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as inventoryController from "./inventory.controller";

const router = Router();

router.patch("/:productId/inventory", asyncHandler(inventoryController.updateInventory));

export default router;
