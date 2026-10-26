import pool from "../../db/pool";
import { CreateEventInput, EventRecord, ListEventsQuery } from "./event.types";

interface EventRow {
  event_id: string;
  user_id: string;
  event_type: EventRecord["eventType"];
  product_id: string | null;
  search_query: string | null;
  timestamp: Date;
  metadata: Record<string, unknown> | null;
}

function mapRow(row: EventRow): EventRecord {
  return {
    eventId: row.event_id,
    userId: row.user_id,
    eventType: row.event_type,
    productId: row.product_id,
    searchQuery: row.search_query,
    timestamp: row.timestamp.toISOString(),
    metadata: row.metadata,
  };
}

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

export async function listEvents(query: ListEventsQuery): Promise<{ events: EventRecord[]; total: number }> {
  const conditions: string[] = [];
  const values: unknown[] = [];
  let i = 1;

  if (query.eventType) {
    conditions.push(`ue.event_type = $${i++}`);
    values.push(query.eventType);
  }
  if (query.userId) {
    conditions.push(`ue.user_id = $${i++}`);
    values.push(query.userId);
  }
  if (query.productId) {
    conditions.push(`ue.product_id = $${i++}`);
    values.push(query.productId);
  }

  // Events have no seller_id of their own - a "seller's events" means events
  // whose product belongs to that seller, so we INNER JOIN through products.
  // This naturally excludes events with no productId (e.g. SEARCH_PERFORMED),
  // since those can't be attributed to any single seller.
  const joinClause = query.sellerId ? `JOIN products p ON p.product_id = ue.product_id` : "";
  if (query.sellerId) {
    conditions.push(`p.seller_id = $${i++}`);
    values.push(query.sellerId);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
  const offset = (query.page - 1) * query.limit;

  const [listResult, countResult] = await Promise.all([
    pool.query<EventRow>(
      `SELECT ue.* FROM user_events ue
       ${joinClause}
       ${whereClause}
       ORDER BY ue.timestamp DESC
       LIMIT $${i} OFFSET $${i + 1}`,
      [...values, query.limit, offset]
    ),
    pool.query<{ count: string }>(`SELECT COUNT(*) FROM user_events ue ${joinClause} ${whereClause}`, values),
  ]);

  return {
    events: listResult.rows.map(mapRow),
    total: Number(countResult.rows[0].count),
  };
}
