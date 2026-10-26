import pool from "../../db/pool";
import { ProductWithInventory } from "../product/product.types";

interface ProductRow {
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

function mapRow(row: ProductRow): ProductWithInventory {
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

/** Hydrates black-box product IDs against the Product DB, dropping inactive,
 * out-of-stock, or unknown IDs. Order is NOT preserved here — callers must
 * re-sort against their own ranking (e.g. the black box's score order). */
export async function findActiveInStockByIds(ids: string[]): Promise<ProductWithInventory[]> {
  if (ids.length === 0) return [];

  const result = await pool.query<ProductRow>(
    `SELECT p.*, i.quantity
     FROM products p
     JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = ANY($1::uuid[]) AND p.is_active = true AND i.quantity > 0`,
    [ids]
  );
  return result.rows.map(mapRow);
}

export async function getTrendingProducts(limit: number): Promise<ProductWithInventory[]> {
  const purchased = await pool.query<ProductRow>(
    `SELECT p.*, i.quantity
     FROM user_events ue
     JOIN products p ON p.product_id = ue.product_id
     JOIN inventory i ON i.product_id = p.product_id
     WHERE ue.event_type = 'PURCHASED' AND p.is_active = true AND i.quantity > 0
     GROUP BY p.product_id, i.quantity
     ORDER BY COUNT(ue.event_id) DESC
     LIMIT $1`,
    [limit]
  );

  const results = purchased.rows.map(mapRow);
  const remaining = limit - results.length;
  if (remaining <= 0) return results;

  const excludeIds = results.map((r) => r.productId);
  const padding = await pool.query<ProductRow>(
    excludeIds.length > 0
      ? `SELECT p.*, i.quantity
         FROM products p
         JOIN inventory i ON i.product_id = p.product_id
         WHERE p.is_active = true AND i.quantity > 0 AND p.product_id <> ALL($2::uuid[])
         ORDER BY p.created_at DESC
         LIMIT $1`
      : `SELECT p.*, i.quantity
         FROM products p
         JOIN inventory i ON i.product_id = p.product_id
         WHERE p.is_active = true AND i.quantity > 0
         ORDER BY p.created_at DESC
         LIMIT $1`,
    excludeIds.length > 0 ? [remaining, excludeIds] : [remaining]
  );

  return [...results, ...padding.rows.map(mapRow)];
}
