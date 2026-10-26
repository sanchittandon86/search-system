import pool from "../../db/pool";
import { Inventory } from "./inventory.types";

interface InventoryRow {
  product_id: string;
  quantity: number;
  updated_at: Date;
}

function mapRow(row: InventoryRow): Inventory {
  return { productId: row.product_id, quantity: row.quantity, updatedAt: row.updated_at };
}

export async function exists(productId: string): Promise<boolean> {
  const result = await pool.query(`SELECT 1 FROM inventory WHERE product_id = $1`, [productId]);
  return result.rows.length > 0;
}

export async function setQuantity(productId: string, quantity: number): Promise<Inventory | null> {
  const result = await pool.query<InventoryRow>(
    `UPDATE inventory SET quantity = $1, updated_at = now() WHERE product_id = $2 RETURNING *`,
    [quantity, productId]
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

/**
 * Atomic conditional update: only succeeds if the resulting quantity stays >= 0.
 * Prevents overselling under concurrent decrements without application-level locking.
 */
export async function adjustQuantity(productId: string, delta: number): Promise<Inventory | null> {
  const result = await pool.query<InventoryRow>(
    `UPDATE inventory
     SET quantity = quantity + $1, updated_at = now()
     WHERE product_id = $2 AND quantity + $1 >= 0
     RETURNING *`,
    [delta, productId]
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}
