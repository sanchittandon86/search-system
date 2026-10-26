import { EventRecord } from "../../types";

const EVENT_BADGE_CLASS: Record<string, string> = {
  PURCHASED: "status-badge--active",
  ADD_TO_CART: "status-badge--active",
  PRODUCT_VIEWED: "event-badge--neutral",
  PRODUCT_CLICKED: "event-badge--neutral",
  SEARCH_PERFORMED: "event-badge--neutral",
  WISHLISTED: "status-badge--outofstock",
  REMOVE_FROM_CART: "status-badge--inactive",
};

interface Props {
  events: EventRecord[];
  productNameById: Map<string, string>;
}

export function EventsTable({ events, productNameById }: Props) {
  return (
    <table className="dash-table">
      <thead>
        <tr>
          <th>Event Type</th>
          <th>User</th>
          <th>Product / Query</th>
          <th>Metadata</th>
          <th>Timestamp</th>
        </tr>
      </thead>
      <tbody>
        {events.map((event) => (
          <tr key={event.eventId}>
            <td>
              <span className={`status-badge ${EVENT_BADGE_CLASS[event.eventType] ?? "event-badge--neutral"}`}>
                {event.eventType}
              </span>
            </td>
            <td>
              <p className="dash-table__id">#{event.userId.slice(0, 8).toUpperCase()}</p>
            </td>
            <td>
              {event.productId ? (
                <p className="dash-table__name">{productNameById.get(event.productId) ?? `#${event.productId.slice(0, 8).toUpperCase()}`}</p>
              ) : event.searchQuery ? (
                <p className="dash-table__name">&quot;{event.searchQuery}&quot;</p>
              ) : (
                <p className="dash-table__subtext">-</p>
              )}
            </td>
            <td>
              <p className="dash-table__subtext">{event.metadata ? JSON.stringify(event.metadata) : "-"}</p>
            </td>
            <td>
              <p className="dash-table__subtext">{new Date(event.timestamp).toLocaleString()}</p>
            </td>
          </tr>
        ))}
        {events.length === 0 && (
          <tr>
            <td colSpan={5} className="dash-table__empty">
              No events match the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
