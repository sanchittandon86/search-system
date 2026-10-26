import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as sellerController from "./seller.controller";

const router = Router();

router.post("/:sellerId/products", asyncHandler(sellerController.createProduct));
router.patch("/:sellerId/products/:productId", asyncHandler(sellerController.updateProduct));
router.get("/:sellerId/products", asyncHandler(sellerController.listProducts));

export default router;
