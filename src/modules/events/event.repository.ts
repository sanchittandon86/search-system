import pool from "../../db/pool";
import { CreateEventInput } from "./event.types";

export async function insertEvent(eventId: string, input: CreateEventInput): Promise<void> {
  await pool.query(
    `INSERT INTO user_events (event_id, user_id, event_type, product_id, search_query, timestamp, metadata)
     VALUES ($1, $2, $3, $4, $5, COALESCE($6::timestamptz, now()), $7)
     ON CONFLICT (event_id) DO NOTHING`,
    [
      eventId,
      input.userId,
      input.eventType,
      input.productId ?? null,
      input.searchQuery ?? null,
      input.timestamp ?? null,
      input.metadata ? JSON.stringify(input.metadata) : null,
    ]
  );
}
