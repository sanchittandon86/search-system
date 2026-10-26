import { Request, Response } from "express";
import * as eventService from "./event.service";

export async function createEvent(req: Request, res: Response) {
  const result = await eventService.createEvent(req.body);
  res.status(202).json(result);
}
