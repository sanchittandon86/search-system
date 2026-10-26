import { Request, Response } from "express";
import * as sellerService from "./seller.service";

function parsePagination(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, Number(req.query.limit) || 20));
  return { page, limit };
}

export async function createProduct(req: Request, res: Response) {
  const { sellerId } = req.params;
  const product = await sellerService.createProduct(sellerId, req.body);
  res.status(201).json(product);
}

export async function updateProduct(req: Request, res: Response) {
  const { sellerId, productId } = req.params;
  const product = await sellerService.updateProduct(sellerId, productId, req.body);
  res.status(200).json(product);
}

export async function listProducts(req: Request, res: Response) {
  const { sellerId } = req.params;
  const { page, limit } = parsePagination(req);
  const result = await sellerService.listSellerProducts(sellerId, page, limit);
  res.status(200).json(result);
}

export async function listSellers(_req: Request, res: Response) {
  const sellers = await sellerService.listSellers();
  res.status(200).json({ sellers });
}
