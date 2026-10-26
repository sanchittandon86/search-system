import { useState } from "react";
import { DashboardPage } from "./pages/DashboardPage";
import { StorefrontPage } from "./pages/StorefrontPage";

export type View = "storefront" | "dashboard";

export default function App() {
  const [view, setView] = useState<View>("storefront");

  return view === "storefront" ? (
    <StorefrontPage view={view} onSwitchView={setView} />
  ) : (
    <DashboardPage view={view} onSwitchView={setView} />
  );
}
