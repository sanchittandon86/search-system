import { formatPrice } from "../api";
import { Product } from "../types";

interface Props {
  products: Product[];
  source: "personalized" | "fallback" | null;
  loading: boolean;
  onRefresh: () => void;
  onAddToCart: (product: Product) => void;
}

export function Recommendations({ products, source, loading, onRefresh, onAddToCart }: Props) {
  return (
    <section className="recommendations">
      <div className="recommendations__header">
        <h2>Recommended for you</h2>
        {source && (
          <span className={`badge badge--${source}`}>
            {source === "personalized" ? "Personalized" : "Fallback (trending)"}
          </span>
        )}
        <button className="link-button" onClick={onRefresh} disabled={loading}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>
      <p className="recommendations__note">
        Cached for up to 5 minutes (see docs/phase6.md) — click Refresh if you just added events and don't see
        changes yet.
      </p>
      <div className="recommendations__list">
        {products.length === 0 && !loading && <p>No recommendations yet.</p>}
        {products.map((product) => (
          <div key={product.productId} className="recommendation-item">
            <span>{product.name}</span>
            <span>{formatPrice(product.price)}</span>
            <button disabled={product.quantity <= 0} onClick={() => onAddToCart(product)}>
              Add to Cart
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
