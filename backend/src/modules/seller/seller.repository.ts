import pool from "../../db/pool";
import { Seller } from "./seller.types";

interface SellerRow {
  seller_id: string;
  name: string;
  status: "ACTIVE" | "SUSPENDED";
  created_at: Date;
}

function mapRow(row: SellerRow): Seller {
  return {
    sellerId: row.seller_id,
    name: row.name,
    status: row.status,
    createdAt: row.created_at,
  };
}

export async function findSellerById(sellerId: string): Promise<Seller | null> {
  const result = await pool.query<SellerRow>(`SELECT * FROM sellers WHERE seller_id = $1`, [sellerId]);
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function listSellers(): Promise<Seller[]> {
  const result = await pool.query<SellerRow>(`SELECT * FROM sellers ORDER BY name`);
  return result.rows.map(mapRow);
}
