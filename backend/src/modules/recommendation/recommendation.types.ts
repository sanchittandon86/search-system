export interface BlackBoxCandidate {
  productId: string;
  score: number;
}

export interface RecommendationResponse<T> {
  recommendations: T[];
  source: "personalized" | "fallback";
}
