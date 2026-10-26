import pool from "../../db/pool";
import { CreateProductInput, Product, ProductWithInventory, UpdateProductInput } from "./product.types";

interface ProductRow {
  product_id: string;
  seller_id: string;
  name: string;
  description: string | null;
  category_id: string | null;
  price: string;
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

function mapRow(row: ProductRow): Product {
  return {
    productId: row.product_id,
    sellerId: row.seller_id,
    name: row.name,
    description: row.description,
    categoryId: row.category_id,
    price: Number(row.price),
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function insertProductWithInventory(
  sellerId: string,
  input: CreateProductInput
): Promise<ProductWithInventory> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const productResult = await client.query<ProductRow>(
      `INSERT INTO products (seller_id, name, description, category_id, price)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [sellerId, input.name, input.description ?? null, input.categoryId ?? null, input.price]
    );
    const productRow = productResult.rows[0];

    const quantity = input.quantity ?? 0;
    await client.query(
      `INSERT INTO inventory (product_id, quantity) VALUES ($1, $2)`,
      [productRow.product_id, quantity]
    );

    await client.query("COMMIT");

    return { ...mapRow(productRow), quantity };
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function findProductById(productId: string): Promise<ProductWithInventory | null> {
  const result = await pool.query<ProductRow & { quantity: number }>(
    `SELECT p.*, i.quantity
     FROM products p
     JOIN inventory i ON i.product_id = p.product_id
     WHERE p.product_id = $1`,
    [productId]
  );
  if (result.rows.length === 0) return null;
  const row = result.rows[0];
  return { ...mapRow(row), quantity: row.quantity };
}

export async function findProductByIdForSeller(sellerId: string, productId: string): Promise<Product | null> {
  const result = await pool.query<ProductRow>(
    `SELECT * FROM products WHERE product_id = $1 AND seller_id = $2`,
    [productId, sellerId]
  );
  if (result.rows.length === 0) return null;
  return mapRow(result.rows[0]);
}

export async function updateProduct(productId: string, input: UpdateProductInput): Promise<Product> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (input.name !== undefined) {
    fields.push(`name = $${i++}`);
    values.push(input.name);
  }
  if (input.description !== undefined) {
    fields.push(`description = $${i++}`);
    values.push(input.description);
  }
  if (input.categoryId !== undefined) {
    fields.push(`category_id = $${i++}`);
    values.push(input.categoryId);
  }
  if (input.price !== undefined) {
    fields.push(`price = $${i++}`);
    values.push(input.price);
  }
  if (input.isActive !== undefined) {
    fields.push(`is_active = $${i++}`);
    values.push(input.isActive);
  }

  fields.push(`updated_at = now()`);
  values.push(productId);

  const result = await pool.query<ProductRow>(
    `UPDATE products SET ${fields.join(", ")} WHERE product_id = $${i} RETURNING *`,
    values
  );
  return mapRow(result.rows[0]);
}

export async function listProductsBySeller(
  sellerId: string,
  page: number,
  limit: number
): Promise<{ products: ProductWithInventory[]; total: number }> {
  const offset = (page - 1) * limit;

  const [listResult, countResult] = await Promise.all([
    pool.query<ProductRow & { quantity: number }>(
      `SELECT p.*, i.quantity
       FROM products p
       JOIN inventory i ON i.product_id = p.product_id
       WHERE p.seller_id = $1
       ORDER BY p.created_at DESC
       LIMIT $2 OFFSET $3`,
      [sellerId, limit, offset]
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM products WHERE seller_id = $1`, [sellerId]),
  ]);

  return {
    products: listResult.rows.map((row) => ({ ...mapRow(row), quantity: row.quantity })),
    total: Number(countResult.rows[0].count),
  };
}
