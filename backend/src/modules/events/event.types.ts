export const EVENT_TYPES = [
  "PRODUCT_VIEWED",
  "PRODUCT_CLICKED",
  "SEARCH_PERFORMED",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "WISHLISTED",
  "PURCHASED",
] as const;

export type EventType = (typeof EVENT_TYPES)[number];

export interface CreateEventInput {
  eventId?: string;
  userId: string;
  eventType: EventType;
  productId?: string;
  searchQuery?: string;
  timestamp?: string;
  metadata?: Record<string, unknown>;
}

export interface EventRecord {
  eventId: string;
  userId: string;
  eventType: EventType;
  productId: string | null;
  searchQuery: string | null;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface ListEventsQuery {
  page: number;
  limit: number;
  eventType?: EventType;
  userId?: string;
  productId?: string;
  sellerId?: string;
}

export interface ListEventsResponse {
  events: EventRecord[];
  page: number;
  limit: number;
  total: number;
}
