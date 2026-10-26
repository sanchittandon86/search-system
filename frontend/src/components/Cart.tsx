import { formatPrice } from "../api";
import { CartItem } from "../types";

interface Props {
  items: CartItem[];
  onClose: () => void;
  onRemove: (productId: string) => void;
  onCheckout: () => void;
}

export function Cart({ items, onClose, onRemove, onCheckout }: Props) {
  const total = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cart" onClick={(e) => e.stopPropagation()}>
        <button className="modal__close" onClick={onClose}>
          ×
        </button>
        <h2>Your Cart</h2>
        {items.length === 0 ? (
          <p>Your cart is empty.</p>
        ) : (
          <>
            <ul className="cart__list">
              {items.map((item) => (
                <li key={item.product.productId} className="cart__item">
                  <span>{item.product.name}</span>
                  <span>
                    {item.quantity} × {formatPrice(item.product.price)}
                  </span>
                  <button className="link-button" onClick={() => onRemove(item.product.productId)}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
            <p className="cart__total">Total: {formatPrice(total)}</p>
            <button className="cart__checkout" onClick={onCheckout}>
              Checkout (simulated - fires PURCHASED events)
            </button>
          </>
        )}
      </div>
    </div>
  );
}
