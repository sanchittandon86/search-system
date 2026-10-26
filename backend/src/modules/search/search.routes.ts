import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as searchController from "./search.controller";

const router = Router();

router.get("/search", asyncHandler(searchController.searchProducts));

export default router;
