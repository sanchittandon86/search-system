import { Router } from "express";
import { asyncHandler } from "../../asyncHandler";
import * as recommendationController from "./recommendation.controller";

const router = Router();

router.get("/", asyncHandler(recommendationController.getRecommendations));

export default router;
