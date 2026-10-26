import "dotenv/config";
import express, { NextFunction, Request, Response } from "express";
import pool from "./db/pool";
import { AppError } from "./errors";
import sellerRoutes from "./modules/seller/seller.routes";
import productRoutes from "./modules/product/product.routes";
import inventoryRoutes from "./modules/inventory/inventory.routes";
import searchRoutes from "./modules/search/search.routes";
import eventRoutes from "./modules/events/event.routes";
import recommendationRoutes from "./modules/recommendation/recommendation.routes";

const app = express();
app.use(express.json());

app.get("/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.status(200).json({ status: "ok", db: "connected" });
  } catch (err) {
    res.status(500).json({ status: "error", db: "unreachable" });
  }
});

app.use("/sellers", sellerRoutes);
// Mounted before productRoutes: GET /:productId in productRoutes would
// otherwise swallow GET /products/search by matching "search" as a productId.
app.use("/products", searchRoutes);
app.use("/products", productRoutes);
app.use("/products", inventoryRoutes);
app.use("/events", eventRoutes);
app.use("/recommendations", recommendationRoutes);

app.use((req, res) => {
  res.status(404).json({ error: "route not found" });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "internal server error" });
});

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`search-system listening on port ${port}`);
});
