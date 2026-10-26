import { formatPrice } from "../../api";
import { categoryImageUrl, getCategoryMeta } from "../../categoryMeta";
import { Product } from "../../types";

function statusFor(product: Product): { label: string; className: string } {
  if (!product.isActive) return { label: "Inactive", className: "status-badge--inactive" };
  if (product.quantity <= 0) return { label: "Out of Stock", className: "status-badge--outofstock" };
  return { label: "Active", className: "status-badge--active" };
}

interface Props {
  products: Product[];
  selectedIds: Set<string>;
  onToggleSelect: (productId: string) => void;
  onToggleSelectAll: () => void;
  onEdit: (product: Product) => void;
}

export function ProductsTable({ products, selectedIds, onToggleSelect, onToggleSelectAll, onEdit }: Props) {
  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p.productId));

  return (
    <table className="dash-table">
      <thead>
        <tr>
          <th>
            <input type="checkbox" checked={allSelected} onChange={onToggleSelectAll} />
          </th>
          <th>Product Name</th>
          <th>ID &amp; Create Date</th>
          <th>Price</th>
          <th>Stock</th>
          <th>Status</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        {products.map((product) => {
          const status = statusFor(product);
          return (
            <tr key={product.productId}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.has(product.productId)}
                  onChange={() => onToggleSelect(product.productId)}
                />
              </td>
              <td>
                <div className="dash-table__product">
                  <img
                    className="dash-table__thumb"
                    src={categoryImageUrl(product.categoryId, 80)}
                    alt={getCategoryMeta(product.categoryId).label}
                  />
                  <div>
                    <p className="dash-table__name">{product.name}</p>
                    <p className="dash-table__subtext">{getCategoryMeta(product.categoryId).label}</p>
                  </div>
                </div>
              </td>
              <td>
                <p className="dash-table__id">#{product.productId.slice(0, 8).toUpperCase()}</p>
                <p className="dash-table__subtext">{new Date(product.createdAt).toLocaleDateString()}</p>
              </td>
              <td>{formatPrice(product.price)}</td>
              <td>{product.quantity}</td>
              <td>
                <span className={`status-badge ${status.className}`}>{status.label}</span>
              </td>
              <td>
                <button className="link-button" onClick={() => onEdit(product)}>
                  Edit
                </button>
              </td>
            </tr>
          );
        })}
        {products.length === 0 && (
          <tr>
            <td colSpan={7} className="dash-table__empty">
              No products match the current filters.
            </td>
          </tr>
        )}
      </tbody>
    </table>
  );
}
