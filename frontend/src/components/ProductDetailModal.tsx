import { formatPrice } from "../api";
import { Product } from "../types";

interface Props {
  product: Product;
  onClose: () => void;
  onAddToCart: (product: Product) => void;
  onWishlist: (product: Product) => void;
}

export function ProductDetailModal({ product, onClose, onAddToCart, onWishlist }: Props) {
  const outOfStock = product.quantity <= 0;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>
          ×
        </button>
        <h2>{product.name}</h2>
        <p className="modal__description">{product.description ?? "No description provided."}</p>
        <p className="modal__price">{formatPrice(product.price)}</p>
        <p className="product-card__stock">{outOfStock ? "Out of stock" : `${product.quantity} in stock`}</p>
        <div className="modal__actions">
          <button disabled={outOfStock} onClick={() => onAddToCart(product)}>
            Add to Cart
          </button>
          <button className="secondary" onClick={() => onWishlist(product)}>
            ♡ Wishlist
          </button>
        </div>
      </div>
    </div>
  );
}
