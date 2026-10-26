import { BadRequestError } from "../../errors";
import * as searchRepository from "./search.repository";
import { SearchQuery, SearchResponse, SortBy } from "./search.types";

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

export async function search(query: SearchQuery): Promise<SearchResponse> {
  const { results, total } = await searchRepository.search(query);
  return { results, page: query.page, limit: query.limit, total };
}
