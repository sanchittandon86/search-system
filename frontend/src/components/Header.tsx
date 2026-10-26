interface Props {
  cartCount: number;
  onCartClick: () => void;
  onShopClick: () => void;
}

export function Header({ cartCount, onCartClick, onShopClick }: Props) {
  return (
    <header className="site-header">
      <div className="site-header__left">
        <span className="site-header__logo">SEARCH SYSTEM</span>
        <nav className="site-header__nav">
          <button className="nav-link" onClick={onShopClick}>
            Shop
          </button>
          <span className="nav-link nav-link--static">About</span>
        </nav>
      </div>
      <div className="site-header__right">
        <span className="nav-link nav-link--static">Logged in as Test User</span>
        <button className="icon-button" onClick={onCartClick} aria-label="Cart">
          <span>Cart</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
      </div>
    </header>
  );
}
