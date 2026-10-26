import { formatPrice } from "../api";
import { categoryImageUrl, getCategoryMeta } from "../categoryMeta";
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
    <section className="recommendations">
      <div className="recommendations__header">
        <div>
          <h2>Personalized Recommendations</h2>
          <p className="recommendations__tagline">
            {source === "fallback" ? "Trending now (black box unavailable)." : "Based on your browsing."}
          </p>
        </div>
        {!expanded && (
          <button className="pill-button" onClick={onViewAll}>
            View All Recommendations
          </button>
        )}
      </div>

      {loading && <p className="recommendations__loading">Loading…</p>}
      {!loading && products.length === 0 && <p className="recommendations__loading">No recommendations yet.</p>}

      <div className="recommendations__grid">
        {products.map((product) => (
          <div key={product.productId} className="recommendation-card">
            <button
              className="recommendation-card__image"
              onClick={() => onView(product)}
              aria-label={`View ${product.name}`}
            >
              <img src={categoryImageUrl(product.categoryId, 200)} alt={getCategoryMeta(product.categoryId).label} />
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
    </section>
  );
}
