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
      <button className="product-card__wishlist" onClick={() => onWishlist(product)} title="Add to wishlist">
        ♡
      </button>
      <button className="product-card__name" onClick={() => onView(product)}>
        {product.name}
      </button>
      <p className="product-card__price">{formatPrice(product.price)}</p>
      <p className="product-card__stock">{outOfStock ? "Out of stock" : `${product.quantity} in stock`}</p>
      <button
        className="product-card__add"
        disabled={outOfStock}
        onClick={() => onAddToCart(product)}
      >
        Add to Cart
      </button>
    </div>
  );
}
