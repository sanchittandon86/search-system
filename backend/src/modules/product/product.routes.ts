import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as productController from "./product.controller";

const router = Router();

router.get("/:productId", asyncHandler(productController.getProduct));

export default router;
