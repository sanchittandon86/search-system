import { Request, Response } from "express";
import * as productService from "./product.service";

export async function getProduct(req: Request, res: Response) {
  const { productId } = req.params;
  const product = await productService.getProductById(productId);
  res.status(200).json(product);
}
