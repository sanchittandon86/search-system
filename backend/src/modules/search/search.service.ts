import { getCached, setCached } from "../../cache/cache";
import { BadRequestError } from "../../errors";
import * as searchClient from "./search.client";
import * as searchRepository from "./search.repository";
import { SearchQuery, SearchResponse, SearchResultItem, SortBy } from "./search.types";

const SEARCH_CACHE_TTL_SECONDS = 60;

const VALID_SORT_BY: SortBy[] = ["price_asc", "price_desc", "relevance"];

function parseNumber(value: unknown, fieldName: string): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (Number.isNaN(parsed)) {
    throw new BadRequestError(`${fieldName} must be a number`);
  }
  return parsed;
}

function parseBoolean(value: unknown, fieldName: string, fallback: boolean): boolean {
  if (value === undefined) return fallback;
  if (value === "true") return true;
  if (value === "false") return false;
  throw new BadRequestError(`${fieldName} must be true or false`);
}

export function parseSearchQuery(raw: Record<string, unknown>): SearchQuery {
  const minPrice = parseNumber(raw.minPrice, "minPrice");
  const maxPrice = parseNumber(raw.maxPrice, "maxPrice");
  if (minPrice !== undefined && maxPrice !== undefined && minPrice > maxPrice) {
    throw new BadRequestError("minPrice must be <= maxPrice");
  }

  const sortBy = (raw.sortBy as SortBy) ?? "relevance";
  if (!VALID_SORT_BY.includes(sortBy)) {
    throw new BadRequestError(`sortBy must be one of ${VALID_SORT_BY.join(", ")}`);
  }

  const page = Math.max(1, Number(raw.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(raw.limit) || 20));

  return {
    q: raw.q ? String(raw.q).trim() : undefined,
    category: raw.category ? String(raw.category) : undefined,
    sellerId: raw.sellerId ? String(raw.sellerId) : undefined,
    minPrice,
    maxPrice,
    isActive: parseBoolean(raw.isActive, "isActive", true),
    sortBy,
    page,
    limit,
  };
}

function applySortOverride(results: SearchResultItem[], sortBy: SortBy): SearchResultItem[] {
  if (sortBy === "price_asc") {
    return [...results].sort((a, b) => a.price - b.price);
  }
  if (sortBy === "price_desc") {
    return [...results].sort((a, b) => b.price - a.price);
  }
  return results; // "relevance" - keep the black box's score order
}

async function searchViaBlackBox(query: SearchQuery): Promise<SearchResponse> {
  // Black box only returns a ranked top-K, not arbitrary offset access, so
  // we overfetch through the requested page and slice locally.
  const overfetchLimit = query.page * query.limit;

  const blackBoxResult = await searchClient.callSearchEngine(
    query.q,
    { category: query.category, minPrice: query.minPrice, maxPrice: query.maxPrice },
    overfetchLimit
  );

  const orderedIds = [...blackBoxResult.products].sort((a, b) => b.score - a.score).map((c) => c.productId);

  const hydrated = await searchRepository.hydrateFiltered(orderedIds, {
    sellerId: query.sellerId,
    isActive: query.isActive,
  });
  const hydratedById = new Map(hydrated.map((p) => [p.productId, p]));

  const ordered = orderedIds
    .map((id) => hydratedById.get(id))
    .filter((p): p is SearchResultItem => p !== undefined);

  const sorted = applySortOverride(ordered, query.sortBy);
  const offset = (query.page - 1) * query.limit;
  const pageSlice = sorted.slice(offset, offset + query.limit);

  return {
    results: pageSlice,
    page: query.page,
    limit: query.limit,
    // Approximate: the black box's total reflects its own filters only —
    // it doesn't know about sellerId/isActive filtering applied above.
    total: blackBoxResult.total,
  };
}

async function searchViaFallback(query: SearchQuery): Promise<SearchResponse> {
  const { results, total } = await searchRepository.naiveSearch(query);
  return { results, page: query.page, limit: query.limit, total };
}

function buildCacheKey(query: SearchQuery): string {
  // Built from the parsed/defaulted query (not the raw query string) so
  // equivalent requests (e.g. omitted vs explicit default limit) share a key.
  return `search:${JSON.stringify(query)}`;
}

export async function search(query: SearchQuery): Promise<SearchResponse> {
  const cacheKey = buildCacheKey(query);
  const cached = await getCached<SearchResponse>(cacheKey);
  if (cached) return cached;

  let result: SearchResponse;
  try {
    result = await searchViaBlackBox(query);
  } catch {
    result = await searchViaFallback(query);
  }

  await setCached(cacheKey, result, SEARCH_CACHE_TTL_SECONDS);
  return result;
}
