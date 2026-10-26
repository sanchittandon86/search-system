import crypto from "crypto";
import { BadRequestError } from "../../errors";
import * as eventRepository from "./event.repository";
import { CreateEventInput, EVENT_TYPES } from "./event.types";

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
