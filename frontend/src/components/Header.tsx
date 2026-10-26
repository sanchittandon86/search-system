import { View } from "../App";

interface Props {
  cartCount: number;
  onCartClick: () => void;
  view: View;
  onSwitchView: (view: View) => void;
}

export function Header({ cartCount, onCartClick, view, onSwitchView }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__left">
        <span className="site-header__logo">SEARCH SYSTEM</span>
      </div>
      <div className="site-header__right">
        <div className="view-switcher">
          <button
            className={view === "storefront" ? "view-switcher__active" : ""}
            onClick={() => onSwitchView("storefront")}
          >
            Storefront
          </button>
          <button
            className={view === "dashboard" ? "view-switcher__active" : ""}
            onClick={() => onSwitchView("dashboard")}
          >
            Seller Dashboard
          </button>
        </div>
        <button className="icon-button" onClick={onCartClick} aria-label="Cart">
          <span>Cart</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
