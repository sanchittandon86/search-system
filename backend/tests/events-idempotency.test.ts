import "dotenv/config";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import pool from "../src/db/pool";
import * as eventService from "../src/modules/events/event.service";

/**
 * Proves POST /events's idempotency guarantee: a client retrying with the
 * same eventId never creates a duplicate row. See docs/phase3.md and
 * docs/phase7.md.
 */
async function main() {
  const userId = crypto.randomUUID();

  try {
    await pool.query(`INSERT INTO users (user_id, name, email) VALUES ($1, $2, $3)`, [
      userId,
      "Test User (events-idempotency)",
      `${crypto.randomUUID()}@example.com`,
    ]);

    const first = await eventService.createEvent({ userId, eventType: "PRODUCT_VIEWED" });
    const second = await eventService.createEvent({
      eventId: first.eventId,
      userId,
      eventType: "PRODUCT_VIEWED",
    });

    assert.equal(second.eventId, first.eventId, "duplicate POST should return the same eventId");

    const rows = await pool.query(`SELECT COUNT(*) FROM user_events WHERE event_id = $1`, [first.eventId]);
    assert.equal(Number(rows.rows[0].count), 1, "exactly one row should exist despite two identical POSTs");

    console.log("PASS: events-idempotency");
  } finally {
    await pool.query(`DELETE FROM user_events WHERE user_id = $1`, [userId]);
    await pool.query(`DELETE FROM users WHERE user_id = $1`, [userId]);
    await pool.end();
  }
}

main().catch((err) => {
  console.error("FAIL: events-idempotency");
  console.error(err);
  process.exit(1);
});
