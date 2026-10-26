import { Request, Response } from "express";
import { BadRequestError } from "../../errors";
import * as recommendationService from "./recommendation.service";

export async function getRecommendations(req: Request, res: Response) {
  const { userId } = req.query;
  if (!userId || typeof userId !== "string") {
    throw new BadRequestError("userId is required");
  }

  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  const result = await recommendationService.getRecommendations(userId, limit);
  res.status(200).json(result);
}
