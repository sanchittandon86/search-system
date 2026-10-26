import { Request, Response } from "express";
import * as eventService from "./event.service";

export async function createEvent(req: Request, res: Response) {
  const result = await eventService.createEvent(req.body);
  res.status(202).json(result);
}

export async function listEvents(req: Request, res: Response) {
  const query = eventService.parseListEventsQuery(req.query as Record<string, unknown>);
  const result = await eventService.listEvents(query);
  res.status(200).json(result);
}
