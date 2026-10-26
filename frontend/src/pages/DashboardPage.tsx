import { useEffect, useMemo, useState } from "react";
import { AddProductModal } from "../components/dashboard/AddProductModal";
import { EditProductModal } from "../components/dashboard/EditProductModal";
import { ProductsTable } from "../components/dashboard/ProductsTable";
import { Sidebar } from "../components/dashboard/Sidebar";
import { StatCard } from "../components/dashboard/StatCard";
import * as sellerApi from "../sellerApi";
import { Product } from "../types";

type StatusFilter = "all" | "active" | "inactive" | "outOfStock";

export function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [toast, setToast] = useState<string | null>(null);

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
      const response = await sellerApi.listSellerProducts(1, 50);
      setProducts(response.products);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

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
    await sellerApi.createProduct(input);
    setAddModalOpen(false);
    showToast("Product created");
    await loadProducts();
  }

  async function handleSaveEdit(
    updates: { name?: string; description?: string; price?: number; isActive?: boolean },
    quantity: number
  ) {
    if (!editingProduct) return;
    await sellerApi.updateProduct(editingProduct.productId, updates);
    if (quantity !== editingProduct.quantity) {
      await sellerApi.setInventoryQuantity(editingProduct.productId, quantity);
    }
    setEditingProduct(null);
    showToast("Product updated");
    await loadProducts();
  }

  async function handleBulkSetActive(isActive: boolean) {
    const ids = Array.from(selectedIds);
    await Promise.all(ids.map((id) => sellerApi.updateProduct(id, { isActive })));
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
    a.download = "products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="dashboard">
      <Sidebar />
      <main className="dashboard__main">
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
      </main>

      {addModalOpen && <AddProductModal onClose={() => setAddModalOpen(false)} onCreate={handleCreate} />}
      {editingProduct && (
        <EditProductModal product={editingProduct} onClose={() => setEditingProduct(null)} onSave={handleSaveEdit} />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
