const INERT_NAV_ITEMS = [
  "Home",
  "Orders",
  "Customers",
  "Content",
  "Finances",
  "Analytics",
  "Marketing",
  "Discounts",
];

// Only "Products" is wired to real data (GET/PATCH/POST /sellers/.../products
// and PATCH /products/.../inventory). The rest of this list exists purely to
// match the requested dashboard layout - clicking them does nothing, since
// no backend API exists for orders/customers/analytics/etc. (out of scope,
// per readme.txt's "WHAT NOT TO BUILD").
export function Sidebar() {
  return (
    <aside className="dash-sidebar">
      <div className="dash-sidebar__brand">Search System</div>
      <p className="dash-sidebar__section">Main</p>
      <nav>
        {INERT_NAV_ITEMS.slice(0, 2).map((item) => (
          <span key={item} className="dash-nav-item dash-nav-item--inert">
            {item}
          </span>
        ))}
        <span className="dash-nav-item dash-nav-item--active">Products</span>
        {INERT_NAV_ITEMS.slice(2).map((item) => (
          <span key={item} className="dash-nav-item dash-nav-item--inert">
            {item}
          </span>
        ))}
      </nav>
    </aside>
  );
}
