import { formatPrice } from "../api";
import { categoryImageUrl, getCategoryMeta } from "../categoryMeta";
import { Product } from "../types";

interface Props {
  product: Product;
  onView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onWishlist: (product: Product) => void;
}

// Derived purely from the real rating (itself derived from PURCHASED
// events, see backend/search.repository.ts) - not fabricated marketing copy.
function badgeFor(rating: number | null | undefined): string | null {
  if (rating === 5) return "Bestseller";
  if (rating === 4) return "Popular";
  return null;
}

export function ProductCard({ product, onView, onAddToCart, onWishlist }: Props) {
  const outOfStock = product.quantity <= 0;
  const badge = badgeFor(product.rating);
  const category = getCategoryMeta(product.categoryId);

  return (
    <div className="product-card">
      <button className="product-card__image" onClick={() => onView(product)} aria-label={`View ${product.name}`}>
        <img src={categoryImageUrl(product.categoryId)} alt={category.label} loading="lazy" />
        {badge && <span className="product-card__badge">{badge}</span>}
      </button>
      <button className="product-card__wishlist" onClick={() => onWishlist(product)} title="Add to wishlist">
        ♡
      </button>
      <div className="product-card__body">
        <p className="product-card__category">{category.label}</p>
        <button className="product-card__name" onClick={() => onView(product)}>
          {product.name}
        </button>
        {product.rating != null && (
          <p className="product-card__rating">
            {"★".repeat(product.rating)}
            {"☆".repeat(5 - product.rating)}
            <span className="product-card__rating-count"> ({product.purchaseCount ?? 0})</span>
          </p>
        )}
        <p className="product-card__stock">{outOfStock ? "Out of stock" : `${product.quantity} in stock`}</p>
        <div className="product-card__footer">
          <span className="product-card__price">{formatPrice(product.price)}</span>
          <button className="pill-button" disabled={outOfStock} onClick={() => onAddToCart(product)}>
            Add to Cart
          </button>
        </div>
      </div>
    </div>
  );
}
