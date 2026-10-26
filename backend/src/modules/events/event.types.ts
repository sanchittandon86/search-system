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
