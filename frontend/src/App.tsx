import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { StorefrontPage } from "./pages/StorefrontPage";

type View = "storefront" | "dashboard";

export default function App() {
  const [view, setView] = useState<View>("storefront");

  return (
    <>
      <div className="view-switcher">
        <button
          className={view === "storefront" ? "view-switcher__active" : ""}
          onClick={() => setView("storefront")}
        >
          Storefront
        </button>
        <button
          className={view === "dashboard" ? "view-switcher__active" : ""}
          onClick={() => setView("dashboard")}
        >
          Seller Dashboard
        </button>
      </div>
      {view === "storefront" ? <StorefrontPage /> : <DashboardPage />}
    </>
  );
}
