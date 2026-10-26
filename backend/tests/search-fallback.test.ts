import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../src/db/pool";
import * as productRepository from "../src/modules/product/product.repository";
import * as searchService from "../src/modules/search/search.service";

/**
 * Proves that when the search black box is unreachable, GET /products/search
 * still returns correct results via the unchanged Phase 2 naive Postgres
 * search, rather than throwing. See docs/phase5.md and docs/phase7.md.
 */
async function main() {
  const sellerId = crypto.randomUUID();
  const uniqueName = `ZzzFallbackTestProduct-${crypto.randomUUID()}`;
  let productId: string | undefined;

  const originalSearchEngineUrl = process.env.SEARCH_ENGINE_URL;

  try {
    await pool.query(`INSERT INTO sellers (seller_id, name, status) VALUES ($1, $2, 'ACTIVE')`, [
      sellerId,
      "Test Seller (search-fallback)",
    ]);

    const product = await productRepository.insertProductWithInventory(sellerId, {
      name: uniqueName,
      price: 500,
      quantity: 5,
    });
    productId = product.productId;

    // Point at a port nothing is listening on, so the black box call fails
    // fast (ECONNREFUSED) for the duration of this test only.
    process.env.SEARCH_ENGINE_URL = "http://localhost:9/search-engine/search";

    const query = searchService.parseSearchQuery({ q: uniqueName });
    const response = await searchService.search(query);

    assert.equal(response.results.length, 1, "fallback search should find exactly the seeded product");
    assert.equal(response.results[0].productId, productId, "fallback search should return the correct product");

    console.log("PASS: search-fallback");
  } finally {
    process.env.SEARCH_ENGINE_URL = originalSearchEngineUrl;
    if (productId) {
      await pool.query(`DELETE FROM inventory WHERE product_id = $1`, [productId]);
      await pool.query(`DELETE FROM products WHERE product_id = $1`, [productId]);
    }
    await pool.query(`DELETE FROM sellers WHERE seller_id = $1`, [sellerId]);
    await pool.end();
  }

  // Redis stays connected via the shared client used by search.service's
  // caching; force exit rather than wiring up a graceful close for a
  // one-shot test script.
  process.exit(0);
}

main().catch((err) => {
  console.error("FAIL: search-fallback");
  console.error(err);
  process.exit(1);
});
