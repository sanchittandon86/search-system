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
  created_at: Date;
  updated_at: Date;
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
  if (query.sellerId) {
    conditions.push(`p.seller_id = $${i++}`);
    values.push(query.sellerId);
  }
  if (query.minPrice !== undefined) {
    conditions.push(`p.price >= $${i++}`);
    values.push(query.minPrice);
  }
  if (query.maxPrice !== undefined) {
    conditions.push(`p.price <= $${i++}`);
    values.push(query.maxPrice);
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

export async function search(query: SearchQuery): Promise<{ results: SearchResultItem[]; total: number }> {
  const { clause, values } = buildWhereClause(query);
  const offset = (query.page - 1) * query.limit;

  const limitParamIndex = values.length + 1;
  const offsetParamIndex = values.length + 2;

  const [listResult, countResult] = await Promise.all([
    pool.query<SearchRow>(
      `SELECT p.*, i.quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.product_id
       WHERE ${clause}
       ORDER BY ${sortClause(query.sortBy)}
       LIMIT $${limitParamIndex} OFFSET $${offsetParamIndex}`,
      [...values, query.limit, offset]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*) FROM products p WHERE ${clause}`,
      values
    ),
  ]);

  return {
    results: listResult.rows.map(mapRow),
    total: Number(countResult.rows[0].count),
  };
}
