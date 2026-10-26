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

  const minRating = parseNumber(raw.minRating, "minRating");
  if (minRating !== undefined && (minRating < 1 || minRating > 5)) {
    throw new BadRequestError("minRating must be between 1 and 5");
  }

  const sortBy = (raw.sortBy as SortBy) ?? "relevance";
  if (!VALID_SORT_BY.includes(sortBy)) {
    throw new BadRequestError(`sortBy must be one of ${VALID_SORT_BY.join(", ")}`);
  }

  const page = Math.max(1, Number(raw.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(raw.limit) || 20));

  // Multi-select brand filter: sellerId=id1,id2,id3 (comma-separated).
  const sellerIds = raw.sellerId
    ? String(raw.sellerId)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    : undefined;

  return {
    q: raw.q ? String(raw.q).trim() : undefined,
    category: raw.category ? String(raw.category) : undefined,
    sellerIds,
    minPrice,
    maxPrice,
    minRating,
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
  // we overfetch through the requested page and slice locally. Floor of 50
  // (this demo catalog's full size) so business filters the black box
  // doesn't know about (isActive, minRating) never run out of candidates to
  // filter from - the same class of bug that sellerId hit before it was
  // forwarded as a black-box filter (see docs/phase5.md's update note).
  const overfetchLimit = Math.max(query.page * query.limit, 50);

  const blackBoxResult = await searchClient.callSearchEngine(
    query.q,
    { category: query.category, minPrice: query.minPrice, maxPrice: query.maxPrice, sellerIds: query.sellerIds },
    overfetchLimit
  );

  const orderedIds = [...blackBoxResult.products].sort((a, b) => b.score - a.score).map((c) => c.productId);

  const hydrated = await searchRepository.hydrateFiltered(orderedIds, {
    sellerIds: query.sellerIds,
    isActive: query.isActive,
    minRating: query.minRating,
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
    // it doesn't know about isActive/minRating filtering applied above
    // (sellerIds IS sent to it, but its count may still include inactive
    // or out-of-stock products from those sellers).
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
