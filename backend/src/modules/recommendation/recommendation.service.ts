import { getCached, setCached } from "../../cache/cache";
import { ProductWithInventory } from "../product/product.types";
import * as recommendationClient from "./recommendation.client";
import * as recommendationRepository from "./recommendation.repository";
import { RecommendationResponse } from "./recommendation.types";

const RECOMMENDATION_CACHE_TTL_SECONDS = 30;

async function computeRecommendations(
  userId: string,
  limit: number
): Promise<RecommendationResponse<ProductWithInventory>> {
  try {
    const candidates = await recommendationClient.callRecommendationEngine(userId, limit);

    // Preserve the black box's ranking: sort by score first, hydrate, then
    // filter in that order rather than trusting whatever order SQL returns.
    const orderedIds = [...candidates].sort((a, b) => b.score - a.score).map((c) => c.productId);
    const hydrated = await recommendationRepository.findActiveInStockByIds(orderedIds);
    const hydratedById = new Map(hydrated.map((p) => [p.productId, p]));

    const recommendations = orderedIds
      .map((id) => hydratedById.get(id))
      .filter((p): p is ProductWithInventory => p !== undefined)
      .slice(0, limit);

    if (recommendations.length > 0) {
      return { recommendations, source: "personalized" };
    }
  } catch {
    // black box timed out, errored, or was unreachable — fall through to trending
  }

  const trending = await recommendationRepository.getTrendingProducts(limit);
  return { recommendations: trending, source: "fallback" };
}

export async function getRecommendations(
  userId: string,
  limit: number
): Promise<RecommendationResponse<ProductWithInventory>> {
  const cacheKey = `recommendations:${userId}:${limit}`;
  const cached = await getCached<RecommendationResponse<ProductWithInventory>>(cacheKey);
  if (cached) return cached;

  const result = await computeRecommendations(userId, limit);
  await setCached(cacheKey, result, RECOMMENDATION_CACHE_TTL_SECONDS);
  return result;
}
