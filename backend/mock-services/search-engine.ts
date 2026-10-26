import "dotenv/config";
import express from "express";
import pool from "../src/db/pool";

// Stands in for an external/internal search engine (e.g. OpenSearch/Elasticsearch).
// Runs as its own process on its own port so it can be killed independently
// to exercise the main app's fallback to naive Postgres search (see docs/phase5.md).

const app = express();
app.use(express.json());

const INVALID_PRODUCT_ID = "00000000-0000-0000-0000-000000000000";

interface SearchRequestBody {
  query?: string;
  filters?: {
    category?: string;
    minPrice?: number;
    maxPrice?: number;
    sellerIds?: string[];
  };
  limit?: number;
}

app.post("/search-engine/search", async (req, res) => {
  const body = req.body as SearchRequestBody;
  const query = body.query?.trim();
  const filters = body.filters ?? {};
  const limit = Number(body.limit) || 20;

  const whereConditions: string[] = [];
  const whereValues: unknown[] = [];
  let idx = 1;

  if (filters.category) {
    whereConditions.push(`category_id = $${idx++}`);
    whereValues.push(filters.category);
  }
  if (filters.minPrice !== undefined) {
    whereConditions.push(`price >= $${idx++}`);
    whereValues.push(filters.minPrice);
  }
  if (filters.maxPrice !== undefined) {
    whereConditions.push(`price <= $${idx++}`);
    whereValues.push(filters.maxPrice);
  }
  if (filters.sellerIds && filters.sellerIds.length > 0) {
    whereConditions.push(`seller_id = ANY($${idx++}::uuid[])`);
    whereValues.push(filters.sellerIds);
  }
  if (query) {
    whereConditions.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
    whereValues.push(`%${query}%`);
    idx++;
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(" AND ")}` : "";
  const orderClause = query ? "score DESC, created_at DESC" : "created_at DESC";

  // Scoring params are appended after whereValues, and only used in the main
  // query — the count query only needs the WHERE-clause values.
  const mainValues = [...whereValues];
  let scoreExpr = "0.5";
  if (query) {
    const exactIdx = idx++;
    const prefixIdx = idx++;
    const containsIdx = idx++;
    scoreExpr = `CASE
      WHEN name ILIKE $${exactIdx} THEN 1.0
      WHEN name ILIKE $${prefixIdx} THEN 0.9
      WHEN name ILIKE $${containsIdx} THEN 0.7
      ELSE 0.5
    END`;
    mainValues.push(query, `${query}%`, `%${query}%`);
  }
  const limitIdx = idx++;
  mainValues.push(limit);

  const mainSql = `
    SELECT product_id, ${scoreExpr} AS score
    FROM products
    ${whereClause}
    ORDER BY ${orderClause}
    LIMIT $${limitIdx}
  `;
  const countSql = `SELECT COUNT(*) FROM products ${whereClause}`;

  const [matchResult, countResult] = await Promise.all([
    pool.query<{ product_id: string; score: string }>(mainSql, mainValues),
    pool.query<{ count: string }>(countSql, whereValues),
  ]);

  const products = matchResult.rows.map((row) => ({
    productId: row.product_id,
    score: Number(row.score),
  }));

  // Simulates the black box returning a stale/deleted product ID with the
  // highest score, so the main app's hydration/filtering step is exercised
  // for real rather than trusted blindly.
  products.unshift({ productId: INVALID_PRODUCT_ID, score: 0.99 });

  res.status(200).json({ products, total: Number(countResult.rows[0].count) });
});

const port = Number(process.env.SEARCH_ENGINE_PORT) || 4002;
app.listen(port, () => {
  console.log(`mock search-engine listening on port ${port}`);
});
