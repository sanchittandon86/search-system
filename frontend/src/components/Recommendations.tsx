import { formatPrice } from "../api";
import { Product } from "../types";

interface Props {
  products: Product[];
  source: "personalized" | "fallback" | null;
  loading: boolean;
  expanded: boolean;
  onView: (product: Product) => void;
  onViewAll: () => void;
}

export function Recommendations({ products, source, loading, expanded, onView, onViewAll }: Props) {
  return (
    <aside className="recommendations">
      <h2>Personalized Recommendations</h2>
      <p className="recommendations__tagline">
        {source === "fallback" ? "Trending now (black box unavailable)." : "Based on your browsing."}
      </p>

      {loading && <p className="recommendations__loading">Loading…</p>}
      {!loading && products.length === 0 && <p className="recommendations__loading">No recommendations yet.</p>}

      <div className="recommendations__list">
        {products.map((product) => (
          <div key={product.productId} className="recommendation-card">
            <button
              className="recommendation-card__image"
              onClick={() => onView(product)}
              aria-label={`View ${product.name}`}
            >
              <span>{product.name.charAt(0)}</span>
            </button>
            <div className="recommendation-card__body">
              <p className="recommendation-card__name">{product.name}</p>
              <p className="recommendation-card__subtitle">{product.quantity > 0 ? "In stock" : "Out of stock"}</p>
              <div className="recommendation-card__footer">
                <span className="recommendation-card__price">{formatPrice(product.price)}</span>
                <button className="link-button" onClick={() => onView(product)}>
                  View
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {!expanded && (
        <button className="pill-button pill-button--block" onClick={onViewAll}>
          View All Recommendations
        </button>
      )}
    </aside>
  );
}
