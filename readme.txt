================================================================================
E-COMMERCE SEARCH & RECOMMENDATION SYSTEM - README
================================================================================

PURPOSE
-------
A basic, interview-quality e-commerce backend focused on three things:

  1. Product Search
  2. Product Recommendations
  3. Collecting user action/events that feed the recommendation system

Search ranking and recommendation intelligence are treated as external
BLACK BOXES. We do NOT implement any ML model, ranking algorithm, embeddings,
TF-IDF/BM25, or neural ranking ourselves. We only integrate with them through
an HTTP API contract (mocked locally for this project).

This is NOT a production-scale Amazon/Flipkart clone. It is intentionally
simple enough for a ~2-years-experience SDE to build and explain end to end.

EXPLICITLY OUT OF SCOPE
-----------------------
- Payments
- Orders
- Shipping / Returns
- Coupons
- Complex authentication
- ML model training / neural networks
- Search ranking algorithm implementation
- Recommendation model implementation

ARCHITECTURE STYLE
-------------------
Modular monolith (NOT microservices). One deployable Node.js service with
clearly separated modules:

    src/modules/
        seller/
        product/
        inventory/
        search/
        recommendation/
        events/

Rationale: at this scale, a modular monolith is simpler to build, test, and
reason about than microservices. Modules can be extracted into separate
services later if traffic or team ownership requires it.

HIGH-LEVEL FLOW
----------------
Frontend
   |
   +--- Search API ---> Search Service ---> Search Black Box
   |                           |
   |                      Product DB (hydrate IDs, filter active/in-stock)
   |
   +--- Recommendation API ---> Rec Service ---> Rec Black Box
   |                                  |
   |                             Product DB (validate active/in-stock)
   |
   +--- Event API ---> Event DB  --(consumed later by)--> Recommendation pipeline

Seller ---> Product API ---> Product DB
                 |
            Inventory DB (quantity, never negative)

SEARCH vs RECOMMENDATION (quick distinction)
---------------------------------------------
Search:          user explicitly asks "comfortable shoes" -> system returns
                 the most relevant matches for that query.
Recommendation:  user asks nothing specific -> system infers interest from
                 past behavior (views/clicks/purchases) and suggests products.

TECHNOLOGY STACK
-----------------
Frontend:     React + Vite + TypeScript, in frontend/ (not the focus of this
              project - a minimal buyer-facing storefront built to exercise
              the backend end-to-end: browse/search, product detail, cart,
              checkout, and recommendations. See "FRONTEND" section below.)
Backend:      Node.js + Express + TypeScript
Database:     PostgreSQL (single DB for products, inventory, users, events)
Search:       PostgreSQL Full-Text Search initially (fallback path), with a
              mocked "search black box" HTTP endpoint simulating an external
              search engine contract
Recommendation: Mocked "recommendation black box" HTTP endpoint simulating
              an external ML recommendation service contract
Caching:      Redis (OPTIONAL - added only once there is evidence of repeated
              read load; not required for the initial build)
Events:       PostgreSQL table initially (Kafka only introduced if/when event
              volume genuinely requires it - not part of initial build)

CORE DATA MODELS
-----------------
users        (user_id, name, email, created_at)
sellers      (seller_id, name, status, created_at)
products     (product_id, seller_id, name, description, category_id, price,
              is_active, created_at, updated_at)
inventory    (product_id, quantity CHECK >= 0, updated_at)
user_events  (event_id, user_id, event_type, product_id, search_query,
              timestamp, metadata)

KEY API ENDPOINTS
------------------
Seller / Product:
  POST   /sellers/{sellerId}/products
  PATCH  /sellers/{sellerId}/products/{productId}
  GET    /sellers/{sellerId}/products
  GET    /products/{productId}

Inventory:
  PATCH  /products/{productId}/inventory

Search:
  GET    /products/search?q=&category=&minPrice=&maxPrice=&sortBy=&page=&limit=

Recommendations:
  GET    /recommendations?userId=&limit=

Events:
  POST   /events

BLACK BOX CONTRACTS (mocked in this project)
-----------------------------------------------
Search black box:
  POST /search-engine/search
  Request:  { query, filters: { category, minPrice, maxPrice }, limit }
  Response: { products: [ { productId, score }, ... ] }

Recommendation black box:
  POST /recommendation-engine/recommend
  Request:  { userId, limit }
  Response: { products: [ { productId, score }, ... ] }

Both black boxes return IDs + score ONLY. Full product data (price, stock,
active status) always comes from our own Product DB - this keeps product
data ownership inside our system and avoids a stale/duplicate source of truth.

FAILURE HANDLING PRINCIPLES
------------------------------
- Search black box down       -> fall back to PostgreSQL text search
- Recommendation black box down -> fall back to trending/popular products
- Redis down                  -> bypass cache, go straight to DB
- Event API/DB down           -> never block the user's primary action;
                                  drop or retry the event, don't fail the request
- All black-box calls use a short timeout + at most one retry

HOW TO USE THIS REPO
----------------------
See implementation_plan.txt for the phase-by-phase build order, and
docs/phase0.md through docs/phase7.md for what was actually built and
verified in each phase. All phases (0-7) are complete.

================================================================================
SETUP INSTRUCTIONS (FINAL - ALL PHASES)
================================================================================

PREREQUISITES
--------------
- Node.js 20+ (this repo pins 20.20.2 via .nvmrc - run `nvm use` if you
  manage Node versions with nvm)
- PostgreSQL 16 running locally, reachable on port 5432
- Redis running locally, reachable on port 6379 (OPTIONAL - see Phase 6;
  the app runs fine without it, caching is just a soft dependency)

1. INSTALL DEPENDENCIES
------------------------
    nvm use              # if using nvm; otherwise ensure `node -v` is 20+
    npm install

2. CREATE THE DATABASE
------------------------
    psql -d postgres -c "CREATE ROLE search_system WITH LOGIN PASSWORD 'search_system';"
    psql -d postgres -c "CREATE DATABASE search_system OWNER search_system;"

   (Alternatively, `docker-compose up -d` starts a matching Postgres
   container if you prefer Docker over a local install - not required,
   just an option.)

3. CONFIGURE ENVIRONMENT
--------------------------
    cp .env.example .env

   Default values in .env.example work out of the box against the setup
   above:

    PORT=3100                                  # main app
    DATABASE_URL=postgres://search_system:search_system@localhost:5432/search_system

    MOCK_RECOMMENDATION_PORT=4001
    RECOMMENDATION_ENGINE_URL=http://localhost:4001/recommendation-engine/recommend
    RECOMMENDATION_TIMEOUT_MS=400

    SEARCH_ENGINE_PORT=4002
    SEARCH_ENGINE_URL=http://localhost:4002/search-engine/search
    SEARCH_ENGINE_TIMEOUT_MS=400

    REDIS_URL=redis://localhost:6379

    CIRCUIT_BREAKER_FAILURE_THRESHOLD=3
    CIRCUIT_BREAKER_COOLDOWN_MS=10000

4. RUN MIGRATIONS
-------------------
    npm run migrate

   Applies migrations/001_init.sql (creates users, sellers, products,
   inventory, user_events with all indexes/constraints). Safe to re-run.

5. SEED TEST DATA (optional, no creation API exists for these)
------------------------------------------------------------------
    psql -d search_system -c "INSERT INTO sellers (seller_id, name, status) VALUES ('11111111-1111-1111-1111-111111111111', 'Test Seller', 'ACTIVE');"
    psql -d search_system -c "INSERT INTO users (user_id, name, email) VALUES ('33333333-3333-3333-3333-333333333333', 'Test User', 'testuser@example.com');"

6. START THE SERVICES
------------------------
   Three independent processes, each in its own terminal (or background
   them individually):

    npm run dev                        # main app, port 3100
    npm run dev:mock:recommendation    # mock recommendation black box, port 4001
    npm run dev:mock:search            # mock search black box, port 4002

   The main app works even if the two mocks are not running - it falls
   back to naive Postgres search and trending-product recommendations
   respectively (see docs/phase4.md and docs/phase5.md). Redis is also
   optional - the app bypasses caching if Redis is unreachable
   (docs/phase6.md).

   Verify everything is up:
    curl http://localhost:3100/health
    -> {"status":"ok","db":"connected"}

7. START THE FRONTEND (optional - storefront UI)
------------------------------------------------------
    cd frontend
    npm install
    npm run dev                        # frontend, port 5173

   Open http://localhost:5173/ in a browser. Vite's dev server proxies
   /products, /sellers, /recommendations, /events, and /health to the
   main app on port 3100 (see frontend/vite.config.ts) - no CORS setup
   needed on the backend. See "FRONTEND" section below for what it does
   and its own setup notes.

8. RUN THE TEST SUITE
------------------------
    npm test

   Runs three scenario tests directly against Postgres (no running app
   or mocks required): inventory concurrency, event idempotency, and
   search fallback. See docs/phase7.md.

9. BUILD FOR PRODUCTION (optional)
--------------------------------------
    npm run build     # compiles src/ to dist/
    npm start         # runs dist/index.js

QUICK ENDPOINT WALKTHROUGH
-----------------------------
    # Create a product for the seeded test seller
    curl -X POST http://localhost:3100/sellers/11111111-1111-1111-1111-111111111111/products \
      -H "Content-Type: application/json" \
      -d '{"name":"Running Shoes","description":"Comfortable running shoes","price":2499,"quantity":10}'

    # Search for it
    curl "http://localhost:3100/products/search?q=running"

    # Fire a view event
    curl -X POST http://localhost:3100/events \
      -H "Content-Type: application/json" \
      -d '{"userId":"33333333-3333-3333-3333-333333333333","eventType":"PRODUCT_VIEWED","productId":"<productId from create response>"}'

    # Get recommendations
    curl "http://localhost:3100/recommendations?userId=33333333-3333-3333-3333-333333333333&limit=5"

================================================================================
FRONTEND
================================================================================

A minimal React + Vite + TypeScript storefront in frontend/ - a buyer-facing
UI built to exercise the backend end-to-end, not a product in its own right
(the backend/API design is the focus of this project, per readme.txt's
PURPOSE section). Seller/admin endpoints (product creation, inventory
management) have no UI - they're exercised via curl/Postman, as shown above.

WHAT IT DOES
--------------
- Browse/search products (SearchBar -> GET /products/search), with a
  relevance / price_asc / price_desc sort selector
- Click a product -> opens a detail modal (fires PRODUCT_CLICKED, then
  PRODUCT_VIEWED)
- Add to Cart (fires ADD_TO_CART) / Remove from cart (fires REMOVE_FROM_CART)
  / Wishlist heart icon (fires WISHLISTED) - cart state is local to the
  browser tab, not persisted server-side (no Order system exists, per
  readme.txt's "WHAT NOT TO BUILD" / out-of-scope list)
- Checkout button fires one PURCHASED event per cart line (with quantity in
  metadata) and clears the cart - again, simulated, no real order/payment
  record is created
- "Recommended for you" panel (GET /recommendations) showing the live
  personalized/fallback source badge, with its own Add to Cart actions and
  a Refresh button (recommendations are cached up to 5 minutes server-side
  - see docs/phase6.md - so Refresh may show identical results within that
  window; the panel says so explicitly)

HOW IT AUTHENTICATES
------------------------
There is no login/signup flow (out of scope, per readme.txt). The frontend
hardcodes the seeded test user's UUID (frontend/src/api.ts, TEST_USER_ID)
and labels it "Test User" in the header - every event fired by the UI uses
this fixed userId. Seed it first (see SETUP step 5) or every POST /events
call from the UI will fail its userId-exists check (docs/phase3.md).

HOW SEARCH/RECOMMENDATION FAILURES SHOW UP IN THE UI
---------------------------------------------------------
Nothing special - that's the point. Kill either mock service
(dev:mock:search / dev:mock:recommendation) while the frontend is open and
re-run a search or reload recommendations: the UI keeps working identically,
just served by the fallback path (naive Postgres search / trending
products) instead of the black box. This was verified directly: killing
the search mock mid-session and re-searching in the browser still returned
correct, filtered results with no error shown to the user.

FOLDER STRUCTURE
-------------------
    frontend/
      src/
        api.ts                    - fetch wrappers + fire-and-forget postEvent()
        types.ts                  - Product/CartItem/EventType shapes
        App.tsx                   - page state + wiring
        components/
          SearchBar.tsx
          ProductCard.tsx
          ProductDetailModal.tsx
          Cart.tsx
          Recommendations.tsx
      vite.config.ts               - dev-server API proxy to port 3100
