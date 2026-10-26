# Phase 1 — Seller, Product, Inventory (Core CRUD)

## Goal

Build the foundational data layer: sellers can create and manage products,
and inventory can be adjusted safely. No search, no recommendations, no
events yet — this phase only proves the core CRUD + inventory-safety
primitives that every later phase depends on.

## Scope

**In scope:**
- Seller-owned product CRUD (create, update, list)
- Single product lookup
- Inventory read/update with safe concurrency (never goes negative)

**Out of scope (future phases):**
- Search (Phase 2)
- Events (Phase 3)
- Recommendations (Phase 4)
- Auth/session management beyond a plain `sellerId` path param (no login flow)

## Data Model (already created in `migrations/001_init.sql`)

```
sellers
  seller_id   UUID PK
  name        TEXT
  status      TEXT        -- 'ACTIVE' | 'SUSPENDED'
  created_at  TIMESTAMPTZ

products
  product_id   UUID PK
  seller_id    UUID FK -> sellers.seller_id
  name         TEXT
  description  TEXT
  category_id  UUID
  price        NUMERIC(10,2)   CHECK (price > 0)
  is_active    BOOLEAN DEFAULT true
  created_at   TIMESTAMPTZ
  updated_at   TIMESTAMPTZ

inventory
  product_id  UUID PK, FK -> products.product_id
  quantity    INTEGER CHECK (quantity >= 0)
  updated_at  TIMESTAMPTZ
```

No schema changes required for this phase — the migration already covers it.

## Module Structure

```
src/modules/seller/
  seller.routes.ts        -- express Router, mounted at /sellers
  seller.controller.ts    -- parses req, calls service, shapes res
  seller.service.ts       -- business rules (ownership, validation)
  seller.repository.ts    -- raw SQL against `sellers` / `products`

src/modules/product/
  product.routes.ts        -- GET /products/{productId}
  product.controller.ts
  product.service.ts
  product.repository.ts    -- raw SQL against `products`

src/modules/inventory/
  inventory.routes.ts       -- PATCH /products/{productId}/inventory
  inventory.controller.ts
  inventory.service.ts
  inventory.repository.ts   -- atomic UPDATE against `inventory`
```

Keep it simple: no ORM. Plain parameterized SQL via the existing `pg` Pool
(`src/db/pool.ts`). A repository function is just a thin wrapper around one
SQL statement — don't add a generic query builder layer.

## Endpoints

### 1. `POST /sellers/{sellerId}/products`

Create a product (and its inventory row) for a seller.

**Request body:**
```json
{
  "name": "Running Shoes",
  "description": "Lightweight running shoes",
  "categoryId": "b2f1...uuid",
  "price": 2499.00,
  "quantity": 50
}
```

**Response `201 Created`:**
```json
{
  "productId": "a1c3...uuid",
  "sellerId": "d9e2...uuid",
  "name": "Running Shoes",
  "description": "Lightweight running shoes",
  "categoryId": "b2f1...uuid",
  "price": 2499.00,
  "isActive": true,
  "quantity": 50,
  "createdAt": "2026-10-26T12:00:00.000Z",
  "updatedAt": "2026-10-26T12:00:00.000Z"
}
```

**Validation:**
- `sellerId` path param must reference an existing seller with `status = 'ACTIVE'` → else `404 Seller not found` / `403 Seller not active`
- `name` required, non-empty string
- `price` required, must be `> 0`
- `quantity` optional, defaults to `0` if omitted, must be `>= 0`
- `categoryId`, `description` optional

**Implementation note:** creating the product row and the inventory row
must happen in a single DB transaction (`BEGIN; INSERT products; INSERT
inventory; COMMIT;`) so a product never exists without an inventory row.

---

### 2. `PATCH /sellers/{sellerId}/products/{productId}`

Update product fields, including activate/deactivate.

**Request body (all fields optional, at least one required):**
```json
{
  "name": "Running Shoes v2",
  "description": "Updated description",
  "price": 2299.00,
  "categoryId": "b2f1...uuid",
  "isActive": false
}
```

**Response `200 OK`:** updated product object (same shape as create response,
minus `quantity` — inventory is managed separately via Phase 1's inventory
endpoint).

**Validation:**
- Ownership check: `productId` must belong to `sellerId` → else `404 Product
  not found for this seller` (do not leak existence of another seller's
  product — return 404, not 403)
- If `price` provided, must be `> 0`
- If `name` provided, must be non-empty
- At least one updatable field must be present in the body → else `400 Bad
  Request`
- `updated_at` is set to `now()` on every successful update

---

### 3. `GET /sellers/{sellerId}/products?page=&limit=`

List a seller's own products (active and inactive).

**Response `200 OK`:**
```json
{
  "products": [ { "productId": "...", "name": "...", "price": 2499.00, "isActive": true, "quantity": 50 } ],
  "page": 1,
  "limit": 20,
  "total": 1
}
```

**Validation:**
- `sellerId` must exist → else `404`
- `page` defaults to `1`, `limit` defaults to `20`, capped at `50`

---

### 4. `GET /products/{productId}`

Public product detail lookup (used later by Search/Recommendation hydration
too, but testable standalone in this phase).

**Response `200 OK`:**
```json
{
  "productId": "a1c3...uuid",
  "sellerId": "d9e2...uuid",
  "name": "Running Shoes",
  "description": "Lightweight running shoes",
  "categoryId": "b2f1...uuid",
  "price": 2499.00,
  "isActive": true,
  "quantity": 50,
  "createdAt": "...",
  "updatedAt": "..."
}
```

**Validation:**
- `productId` must exist → else `404 Product not found`
- No ownership check here — this is the public-facing lookup (unlike the
  seller-scoped endpoints above)

---

### 5. `PATCH /products/{productId}/inventory`

Adjust stock. Two supported request shapes:

**Absolute set:**
```json
{ "quantity": 10 }
```

**Relative delta (used for decrementing on a sale, incrementing on restock):**
```json
{ "delta": -1 }
```

**Response `200 OK`:**
```json
{ "productId": "a1c3...uuid", "quantity": 9, "updatedAt": "..." }
```

**Validation / concurrency safety:**
- Exactly one of `quantity` or `delta` must be provided → else `400 Bad
  Request`
- `quantity` (absolute) must be `>= 0`
- For `delta`, use an atomic conditional UPDATE so concurrent requests can
  never push stock negative:
  ```sql
  UPDATE inventory
  SET quantity = quantity + $delta, updated_at = now()
  WHERE product_id = $1 AND quantity + $delta >= 0
  RETURNING quantity, updated_at;
  ```
  If this returns 0 rows → `409 Conflict` with `{ "error": "insufficient
  stock" }`
- For absolute `quantity` set, a plain `UPDATE ... SET quantity = $1 WHERE
  product_id = $2` is fine since there's no read-modify-write race (it's
  a direct overwrite, not a relative adjustment) — the `CHECK (quantity >=
  0)` constraint is the backstop here
- `productId` must exist in `inventory` → else `404`

**Why this matters:** this is the one place in Phase 1 where a real
concurrency bug is possible (two simultaneous "buy 1" decrements on the
last unit). The atomic `WHERE quantity + $delta >= 0` clause is what
prevents overselling — no application-level locking needed.

## Error Handling Conventions (apply across all 5 endpoints)

| Scenario | Status | Body |
|---|---|---|
| Resource not found | 404 | `{ "error": "<resource> not found" }` |
| Validation failure | 400 | `{ "error": "<field>: <reason>" }` |
| Ownership mismatch (seller doesn't own product) | 404 | `{ "error": "product not found for this seller" }` |
| Insufficient inventory on delta update | 409 | `{ "error": "insufficient stock" }` |
| Unexpected server/DB error | 500 | `{ "error": "internal server error" }` |

## Testing Plan (manual, via curl/Postman)

1. Create a seller directly via SQL (`INSERT INTO sellers ...`) — no
   seller-creation API in scope for this phase, sellers are seeded.
2. `POST /sellers/{sellerId}/products` → verify 201, product + inventory
   row both exist in DB.
3. `GET /sellers/{sellerId}/products` → verify the created product appears.
4. `GET /products/{productId}` → verify full detail.
5. `PATCH /sellers/{sellerId}/products/{productId}` with `{ "isActive":
   false }` → verify `is_active` flips, `updated_at` changes.
6. `PATCH /products/{productId}/inventory` with `{ "delta": -1 }` repeatedly
   until stock hits 0, then one more time → verify the last call returns
   `409 insufficient stock` and `quantity` never goes negative in the DB.
7. Fire two concurrent `{ "delta": -1 }` requests when `quantity = 1` (e.g.
   via two parallel curl calls) → verify exactly one succeeds and the other
   gets `409` — proves the atomic update prevents overselling.

## Exit Criteria

- All 5 endpoints implemented and manually verified per the testing plan
  above.
- Inventory can never go negative, including under concurrent requests.
- Ownership checks correctly return 404 (not 403) when a seller tries to
  modify another seller's product.
- `npm run build` compiles with no TypeScript errors.
