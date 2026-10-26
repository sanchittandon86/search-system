import pool from "../../db/pool";
import { SearchQuery, SearchResultItem } from "./search.types";

interface SearchRow {
  product_id: string;
  seller_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: string;
  is_active: boolean;
  quantity: number;
  rating: number | null;
  purchase_count: string | null;
  created_at: Date;
  updated_at: Date;
}

// No review/star system exists in this project (out of scope) - "rating" is
// a 1-5 proxy derived purely from each product's PURCHASED event count via
// fixed thresholds. Joined in as a subquery so every search query (naive
// and black-box hydration) can both SELECT and filter on it consistently.
const RATING_JOIN = `
  LEFT JOIN (
    SELECT product_id, COUNT(*) AS purchase_count
    FROM user_events
    WHERE event_type = 'PURCHASED'
    GROUP BY product_id
  ) pc ON pc.product_id = p.product_id
`;
const RATING_SELECT = `
  CASE
    WHEN pc.purchase_count >= 6 THEN 5
    WHEN pc.purchase_count >= 3 THEN 4
    WHEN pc.purchase_count >= 1 THEN 3
    ELSE NULL
  END AS rating,
  COALESCE(pc.purchase_count, 0) AS purchase_count
`;

/** minRating 4-5 map to their real purchase-count thresholds; 1-3 all
 * collapse to "at least one purchase" since the scheme has no tiers below 3. */
function minPurchaseCountForRating(minRating: number): number {
  if (minRating >= 5) return 6;
  if (minRating >= 4) return 3;
  return 1;
}

function mapRow(row: SearchRow): SearchResultItem {
  return {
    productId: row.product_id,
    sellerId: row.seller_id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    price: Number(row.price),
    isActive: row.is_active,
    quantity: row.quantity,
    rating: row.rating,
    purchaseCount: Number(row.purchase_count ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildWhereClause(query: SearchQuery): { clause: string; values: unknown[] } {
  const conditions: string[] = ["p.is_active = $1"];
  const values: unknown[] = [query.isActive];
  let i = 2;

  if (query.q) {
    conditions.push(`(p.name ILIKE $${i} OR p.description ILIKE $${i})`);
    values.push(`%${query.q}%`);
    i++;
  }
  if (query.category) {
    conditions.push(`p.category_id = $${i++}`);
    values.push(query.category);
  }
  if (query.sellerIds && query.sellerIds.length > 0) {
    conditions.push(`p.seller_id = ANY($${i++}::uuid[])`);
    values.push(query.sellerIds);
  }
  if (query.minPrice !== undefined) {
    conditions.push(`p.price >= $${i++}`);
    values.push(query.minPrice);
  }
  if (query.maxPrice !== undefined) {
    conditions.push(`p.price <= $${i++}`);
    values.push(query.maxPrice);
  }
  if (query.minRating !== undefined) {
    conditions.push(`COALESCE(pc.purchase_count, 0) >= $${i++}`);
    values.push(minPurchaseCountForRating(query.minRating));
  }

  return { clause: conditions.join(" AND "), values };
}

function sortClause(sortBy: SearchQuery["sortBy"]): string {
  switch (sortBy) {
    case "price_asc":
      return "p.price ASC";
    case "price_desc":
      return "p.price DESC";
    default:
      return "p.created_at DESC";
  }
}

/**
 * Phase 2's naive Postgres-only search. Now serves as the fallback path
 * for when the search black box (Phase 5) is unavailable.
 */
export async function naiveSearch(query: SearchQuery): Promise<{ results: SearchResultItem[]; total: number }> {
  const { clause, values } = buildWhereClause(query);
  const offset = (query.page - 1) * query.limit;

  const limitParamIndex = values.length + 1;
  const offsetParamIndex = values.length + 2;

  const [listResult, countResult] = await Promise.all([
    pool.query<SearchRow>(
      `SELECT p.*, i.quantity, ${RATING_SELECT}
       FROM products p
       JOIN inventory i ON i.product_id = p.product_id
       ${RATING_JOIN}
       WHERE ${clause}
       ORDER BY ${sortClause(query.sortBy)}
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      [...values, query.limit, offset]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM products p ${RATING_JOIN} WHERE ${clause}`,
      values
    ),
  ]);

  return {
    results: listResult.rows.map(mapRow),
    total: Number(countResult.rows[0].count),
  };
}

/**
 * Hydrates black-box candidate IDs against the Product DB, applying the
 * business filters the black box has no concept of (sellerId ownership,
 * isActive, in-stock, and the purchase-derived rating). Order is NOT
 * preserved — callers must re-sort against their own ranking (the black
 * box's score order, or sortBy).
 */
export async function hydrateFiltered(
  ids: string[],
  filters: { sellerIds?: string[]; isActive: boolean; minRating?: number }
): Promise<SearchResultItem[]> {
  if (ids.length === 0) return [];

  const conditions: string[] = ["p.product_id = ANY($1::uuid[])", "p.is_active = $2", "i.quantity > 0"];
  const values: unknown[] = [ids, filters.isActive];

  if (filters.sellerIds && filters.sellerIds.length > 0) {
    conditions.push(`p.seller_id = ANY($${values.length + 1}::uuid[])`);
    values.push(filters.sellerIds);
  }
  if (filters.minRating !== undefined) {
    conditions.push(`COALESCE(pc.purchase_count, 0) >= $${values.length + 1}`);
    values.push(minPurchaseCountForRating(filters.minRating));
  }

  const result = await pool.query<SearchRow>(
    `SELECT p.*, i.quantity, ${RATING_SELECT}
     FROM products p
     JOIN inventory i ON i.product_id = p.product_id
     ${RATING_JOIN}
     WHERE ${conditions.join(" AND ")}`,
    values
  );
  return result.rows.map(mapRow);
}
