import { formatPrice } from "../api";
import { Product } from "../types";

interface Props {
  product: Product;
  onView: (product: Product) => void;
  onAddToCart: (product: Product) => void;
  onWishlist: (product: Product) => void;
}

export function ProductCard({ product, onView, onAddToCart, onWishlist }: Props) {
  const outOfStock = product.quantity <= 0;

  return (
    <div className="product-card">
      <button className="product-card__image" onClick={() => onView(product)} aria-label={`View ${product.name}`}>
        <span>{product.name.charAt(0)}</span>
      </button>
      <button className="product-card__wishlist" onClick={() => onWishlist(product)} title="Add to wishlist">
        ♡
      </button>
      <div className="product-card__body">
        <button className="product-card__name" onClick={() => onView(product)}>
          {product.name}
        </button>
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
