import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../src/db/pool";
import * as inventoryRepository from "../src/modules/inventory/inventory.repository";
import * as productRepository from "../src/modules/product/product.repository";

/**
 * Proves the atomic conditional UPDATE in inventory.repository.adjustQuantity
 * actually prevents overselling under real concurrency, not just in theory.
 * See docs/phase1.md and docs/phase7.md.
 */
async function main() {
  const sellerId = crypto.randomUUID();
  let productId: string | undefined;

  try {
    await pool.query(`INSERT INTO sellers (seller_id, name, status) VALUES ($1, $2, 'ACTIVE')`, [
      sellerId,
      "Test Seller (inventory-concurrency)",
    ]);

    const product = await productRepository.insertProductWithInventory(sellerId, {
      name: "Concurrency Test Product",
      price: 100,
      quantity: 1,
    });
    productId = product.productId;

    const [resultA, resultB] = await Promise.all([
      inventoryRepository.adjustQuantity(productId, -1),
      inventoryRepository.adjustQuantity(productId, -1),
    ]);

    const successCount = [resultA, resultB].filter((r) => r !== null).length;
    const rejectedCount = [resultA, resultB].filter((r) => r === null).length;

    assert.equal(successCount, 1, "exactly one of the two concurrent decrements should succeed");
    assert.equal(rejectedCount, 1, "exactly one of the two concurrent decrements should be rejected");

    const finalRow = await pool.query<{ quantity: number }>(
      `SELECT quantity FROM inventory WHERE product_id = $1`,
      [productId]
    );
    assert.equal(finalRow.rows[0].quantity, 0, "final quantity must be exactly 0, never negative");

    console.log("PASS: inventory-concurrency");
  } finally {
    if (productId) {
      await pool.query(`DELETE FROM inventory WHERE product_id = $1`, [productId]);
      await pool.query(`DELETE FROM products WHERE product_id = $1`, [productId]);
    }
    await pool.query(`DELETE FROM sellers WHERE seller_id = $1`, [sellerId]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FAIL: inventory-concurrency");
  console.error(err);
  process.exit(1);
});
