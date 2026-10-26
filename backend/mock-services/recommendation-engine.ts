import "dotenv/config";
import express from "express";
import pool from "../src/db/pool";

// Stands in for an external/internal ML recommendation service.
// Runs as its own process on its own port so it can be killed independently
// to exercise the main app's timeout/retry/fallback behavior (see docs/phase4.md).

const app = express();
app.use(express.json());

const INVALID_PRODUCT_ID = "00000000-0000-0000-0000-000000000000";

app.post("/recommendation-engine/recommend", async (req, res) => {
  const limit = Number(req.body?.limit) || 10;

  const result = await pool.query<{ product_id: string }>(
    `SELECT product_id FROM products ORDER BY random() LIMIT $1`,
    [limit]
  );

  const products = result.rows.map((row, idx) => ({
    productId: row.product_id,
    score: Math.round((1 - idx * 0.05) * 100) / 100,
  }));

  // Simulates the black box returning a stale/deleted product ID with the
  // highest score, so the main app's hydration/filtering step is exercised
  // for real rather than trusted blindly.
  products.unshift({ productId: INVALID_PRODUCT_ID, score: 0.99 });

  res.status(200).json({ products });
});

const port = Number(process.env.MOCK_RECOMMENDATION_PORT) || 4001;
app.listen(port, () => {
  console.log(`mock recommendation-engine listening on port ${port}`);
});
