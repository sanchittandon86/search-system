import crypto from "crypto";
import { BadRequestError } from "../../errors";
import * as eventRepository from "./event.repository";
import { CreateEventInput, EVENT_TYPES, EventType, ListEventsResponse } from "./event.types";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface PgError {
  code?: string;
}

function isPgError(err: unknown): err is PgError {
  return typeof err === "object" && err !== null && "code" in err;
}

function validate(input: CreateEventInput): void {
  if (!input.userId || !UUID_REGEX.test(input.userId)) {
    throw new BadRequestError("userId must be a valid UUID");
  }
  if (!input.eventType || !EVENT_TYPES.includes(input.eventType)) {
    throw new BadRequestError(`eventType must be one of ${EVENT_TYPES.join(", ")}`);
  }
}

export async function createEvent(input: CreateEventInput): Promise<{ eventId: string }> {
  validate(input);

  const eventId = input.eventId ?? crypto.randomUUID();

  try {
    await eventRepository.insertEvent(eventId, input);
  } catch (err) {
    if (isPgError(err) && err.code === "23503") {
      throw new BadRequestError("user does not exist");
    }
    if (isPgError(err) && err.code === "22P02") {
      throw new BadRequestError("invalid input format");
    }
    throw err;
  }

  return { eventId };
}

export function parseListEventsQuery(raw: Record<string, unknown>): {
  page: number;
  limit: number;
  eventType?: EventType;
  userId?: string;
  productId?: string;
  sellerId?: string;
} {
  const page = Math.max(1, Number(raw.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(raw.limit) || 50));

  const eventType = raw.eventType ? String(raw.eventType) : undefined;
  if (eventType && !EVENT_TYPES.includes(eventType as EventType)) {
    throw new BadRequestError(`eventType must be one of ${EVENT_TYPES.join(", ")}`);
  }

  return {
    page,
    limit,
    eventType: eventType as EventType | undefined,
    userId: raw.userId ? String(raw.userId) : undefined,
    productId: raw.productId ? String(raw.productId) : undefined,
    sellerId: raw.sellerId ? String(raw.sellerId) : undefined,
  };
}

export async function listEvents(query: ReturnType<typeof parseListEventsQuery>): Promise<ListEventsResponse> {
  const { events, total } = await eventRepository.listEvents(query);
  return { events, page: query.page, limit: query.limit, total };
}
