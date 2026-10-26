import { Request, Response } from "express";
import * as searchService from "./search.service";

export async function searchProducts(req: Request, res: Response) {
  const query = searchService.parseSearchQuery(req.query as Record<string, unknown>);
  const result = await searchService.search(query);
  res.status(200).json(result);
}
