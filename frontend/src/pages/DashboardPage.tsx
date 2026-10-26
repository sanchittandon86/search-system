import { useEffect, useMemo, useState } from "react";
import { View } from "../App";
import { AddProductModal } from "../components/dashboard/AddProductModal";
import { EditProductModal } from "../components/dashboard/EditProductModal";
import { EventsTable } from "../components/dashboard/EventsTable";
import { ProductsTable } from "../components/dashboard/ProductsTable";
import { SellerLogin } from "../components/dashboard/SellerLogin";
import { DashboardSection, Sidebar } from "../components/dashboard/Sidebar";
import { StatCard } from "../components/dashboard/StatCard";
import * as sellerApi from "../sellerApi";
import { clearSession, getStoredSession, SellerSession, storeSession } from "../sellerSession";
import { EventRecord, EventType, Product } from "../types";

type StatusFilter = "all" | "active" | "inactive" | "outOfStock";

const EVENT_TYPES: EventType[] = [
  "PRODUCT_VIEWED",
  "PRODUCT_CLICKED",
  "SEARCH_PERFORMED",
  "ADD_TO_CART",
  "REMOVE_FROM_CART",
  "WISHLISTED",
  "PURCHASED",
];

interface DashboardPageProps {
  view: View;
  onSwitchView: (view: View) => void;
}

export function DashboardPage({ onSwitchView }: DashboardPageProps) {
  const [session, setSession] = useState<SellerSession | null>(() => getStoredSession());

  if (!session) {
    return (
      <SellerLogin
        onLogin={(s) => {
          storeSession(s);
          setSession(s);
        }}
        onSwitchView={onSwitchView}
      />
    );
  }

  return (
    <DashboardContent
      session={session}
      onLogout={() => {
        clearSession();
        setSession(null);
      }}
      onSwitchView={onSwitchView}
    />
  );
}

function DashboardContent({
  session,
  onLogout,
  onSwitchView,
}: {
  session: SellerSession;
  onLogout: () => void;
  onSwitchView: (view: View) => void;
}) {
  const [section, setSection] = useState<DashboardSection>("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const [events, setEvents] = useState<EventRecord[]>([]);
  const [eventsTotal, setEventsTotal] = useState(0);
  const [eventsLoading, setEventsLoading] = useState(false);
  const [eventsError, setEventsError] = useState<string | null>(null);
  const [eventTypeFilter, setEventTypeFilter] = useState<EventType | "all">("all");
  const [eventsPage, setEventsPage] = useState(1);
  const EVENTS_PAGE_SIZE = 25;

  function showToast(message: string) {
    setToast(message);
    setTimeout(() => setToast(null), 2000);
  }

  async function loadProducts() {
    setLoading(true);
    setError(null);
    try {
      // The seller-products endpoint already returns up to 50 products in
      // one page; filtering/sorting below is client-side over that list -
      // no extra backend endpoints added.
      const response = await sellerApi.listSellerProducts(session.sellerId, 1, 50);
      setProducts(response.products);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function loadEvents() {
    setEventsLoading(true);
    setEventsError(null);
    try {
      const response = await sellerApi.listEvents({
        sellerId: session.sellerId,
        page: eventsPage,
        limit: EVENTS_PAGE_SIZE,
        eventType: eventTypeFilter === "all" ? undefined : eventTypeFilter,
      });
      setEvents(response.events);
      setEventsTotal(response.total);
    } catch (err) {
      setEventsError((err as Error).message);
    } finally {
      setEventsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session.sellerId]);

  useEffect(() => {
    if (section === "events") {
      loadEvents();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, eventTypeFilter, eventsPage, session.sellerId]);

  // Events are now scoped to this same seller (GET /events?sellerId=...), so
  // every event's productId necessarily belongs to one of `products` below -
  // no separate cross-seller lookup needed for name resolution.
  const productNameById = useMemo(() => new Map(products.map((p) => [p.productId, p.name])), [products]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (searchTerm && !p.name.toLowerCase().includes(searchTerm.toLowerCase()) && !p.productId.includes(searchTerm)) {
        return false;
      }
      if (statusFilter === "active") return p.isActive && p.quantity > 0;
      if (statusFilter === "inactive") return !p.isActive;
      if (statusFilter === "outOfStock") return p.isActive && p.quantity <= 0;
      return true;
    });
  }, [products, searchTerm, statusFilter]);

  const stats = useMemo(
    () => ({
      total: products.length,
      active: products.filter((p) => p.isActive && p.quantity > 0).length,
      outOfStock: products.filter((p) => p.isActive && p.quantity <= 0).length,
      inactive: products.filter((p) => !p.isActive).length,
    }),
    [products]
  );

  function toggleSelect(productId: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      const allSelected = filteredProducts.length > 0 && filteredProducts.every((p) => prev.has(p.productId));
      if (allSelected) return new Set();
      return new Set(filteredProducts.map((p) => p.productId));
    });
  }

  async function handleCreate(input: sellerApi.CreateProductInput) {
    await sellerApi.createProduct(session.sellerId, input);
    setAddModalOpen(false);
    showToast("Product created");
    await loadProducts();
  }

  async function handleSaveEdit(
    updates: { name?: string; description?: string; price?: number; isActive?: boolean },
    quantity: number
  ) {
    if (!editingProduct) return;
    await sellerApi.updateProduct(session.sellerId, editingProduct.productId, updates);
    if (quantity !== editingProduct.quantity) {
      await sellerApi.setInventoryQuantity(editingProduct.productId, quantity);
    }
    setEditingProduct(null);
    showToast("Product updated");
    await loadProducts();
  }

  async function handleBulkSetActive(isActive: boolean) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => sellerApi.updateProduct(session.sellerId, id, { isActive })));
    setSelectedIds(new Set());
    showToast(`${ids.length} product(s) ${isActive ? "activated" : "deactivated"}`);
    await loadProducts();
  }

  function handleExportCsv() {
    const rows = filteredProducts.map((p) => [p.productId, p.name, p.price, p.quantity, p.isActive ? "active" : "inactive"]);
    const header = ["productId", "name", "price", "quantity", "status"];
    const csv = [header, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${session.name.toLowerCase()}-products.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleSectionChange(next: DashboardSection) {
    setSection(next);
    setSelectedIds(new Set());
  }

  const eventsPageCount = Math.max(1, Math.ceil(eventsTotal / EVENTS_PAGE_SIZE));

  return (
    <div className="dashboard">
      <Sidebar
        sellerName={session.name}
        activeSection={section}
        onSectionChange={handleSectionChange}
        onLogout={onLogout}
        onSwitchView={onSwitchView}
      />
      <main className="dashboard__main">
        {section === "products" ? (
          <>
            <div className="dashboard__topbar">
              <div className="dashboard__title">
                <h1>Products</h1>
                <p>Manage inventory, pricing and availability across your store</p>
              </div>
              <div className="dashboard__topbar-actions">
                <button className="secondary-button" onClick={handleExportCsv}>
                  Export
                </button>
                <button className="pill-button" onClick={() => setAddModalOpen(true)}>
                  + Add product
                </button>
              </div>
            </div>

            <div className="stat-grid">
              <StatCard label="Total Products" value={stats.total} />
              <StatCard label="Active" value={stats.active} />
              <StatCard label="Out of Stock" value={stats.outOfStock} />
              <StatCard label="Inactive" value={stats.inactive} />
            </div>

            <div className="dashboard__toolbar">
              <input
                className="dashboard__search"
                placeholder="Search by product name or ID"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <div className="dashboard__filters">
                {(["all", "active", "inactive", "outOfStock"] as StatusFilter[]).map((filter) => (
                  <button
                    key={filter}
                    className={`filter-tab ${statusFilter === filter ? "filter-tab--active" : ""}`}
                    onClick={() => setStatusFilter(filter)}
                  >
                    {filter === "all" ? "All" : filter === "outOfStock" ? "Out of Stock" : filter[0].toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="error">{error}</p>}
            {loading ? (
              <p>Loading…</p>
            ) : (
              <ProductsTable
                products={filteredProducts}
                selectedIds={selectedIds}
                onToggleSelect={toggleSelect}
                onToggleSelectAll={toggleSelectAll}
                onEdit={setEditingProduct}
              />
            )}

            {selectedIds.size > 0 && (
              <div className="bulk-bar">
                <span>{selectedIds.size} Selected</span>
                <button onClick={() => handleBulkSetActive(true)}>Activate</button>
                <button onClick={() => handleBulkSetActive(false)}>Deactivate</button>
                <button className="link-button" onClick={() => setSelectedIds(new Set())}>
                  Clear
                </button>
              </div>
            )}
          </>
        ) : (
          <>
            <div className="dashboard__topbar">
              <div className="dashboard__title">
                <h1>User Events</h1>
                <p>Events involving {session.name}'s products - via GET /events?sellerId=...</p>
              </div>
              <button className="secondary-button" onClick={loadEvents}>
                Refresh
              </button>
            </div>

            <div className="stat-grid">
              <StatCard label="Total Events" value={eventsTotal} />
            </div>

            <div className="dashboard__toolbar">
              <div className="dashboard__filters">
                <button
                  className={`filter-tab ${eventTypeFilter === "all" ? "filter-tab--active" : ""}`}
                  onClick={() => {
                    setEventTypeFilter("all");
                    setEventsPage(1);
                  }}
                >
                  All
                </button>
                {EVENT_TYPES.map((type) => (
                  <button
                    key={type}
                    className={`filter-tab ${eventTypeFilter === type ? "filter-tab--active" : ""}`}
                    onClick={() => {
                      setEventTypeFilter(type);
                      setEventsPage(1);
                    }}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {eventsError && <p className="error">{eventsError}</p>}
            {eventsLoading ? (
              <p>Loading…</p>
            ) : (
              <EventsTable events={events} productNameById={productNameById} />
            )}

            <div className="dashboard__pagination">
              <button
                className="secondary-button"
                disabled={eventsPage <= 1}
                onClick={() => setEventsPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </button>
              <span>
                Page {eventsPage} of {eventsPageCount}
              </span>
              <button
                className="secondary-button"
                disabled={eventsPage >= eventsPageCount}
                onClick={() => setEventsPage((p) => p + 1)}
              >
                Next
              </button>
            </div>
          </>
        )}
      </main>

      {addModalOpen && <AddProductModal onClose={() => setAddModalOpen(false)} onCreate={handleCreate} />}
      {editingProduct && (
        <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleSaveEdit} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
