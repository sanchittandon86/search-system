import { View } from "../../App";

export type DashboardSection = "products" | "events";

interface Props {
  sellerName: string;
  activeSection: DashboardSection;
  onSectionChange: (section: DashboardSection) => void;
  onLogout: () => void;
  onSwitchView: (view: View) => void;
}

export function Sidebar({ sellerName, activeSection, onSectionChange, onLogout, onSwitchView }: Props) {
  return (
    <aside className="dash-sidebar">
      <button className="dash-sidebar__back" onClick={() => onSwitchView("storefront")}>
        ← Storefront
      </button>
      <div className="dash-sidebar__brand">{sellerName}</div>
      <p className="dash-sidebar__section">Main</p>
      <nav>
        <button
          className={`dash-nav-item ${activeSection === "products" ? "dash-nav-item--active" : ""}`}
          onClick={() => onSectionChange("products")}
        >
          Products
        </button>
        <button
          className={`dash-nav-item ${activeSection === "events" ? "dash-nav-item--active" : ""}`}
          onClick={() => onSectionChange("events")}
        >
          User Events
        </button>
      </nav>
      <button className="dash-sidebar__logout" onClick={onLogout}>
        Log out
      </button>
    </aside>
  );
}
