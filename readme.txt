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
Frontend:     React (not the focus of this project)
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
See implementation_plan.txt for the phase-by-phase build order. Build and
verify each phase before moving to the next - each phase is independently
demoable.
