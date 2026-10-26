import { FormEvent, useEffect, useState } from "react";
import { View } from "../../App";
import * as sellerApi from "../../sellerApi";
import { DEMO_PASSWORD, SellerSession } from "../../sellerSession";

interface Props {
  onLogin: (session: SellerSession) => void;
  onSwitchView: (view: View) => void;
}

export function SellerLogin({ onLogin, onSwitchView }: Props) {
  const [sellers, setSellers] = useState<sellerApi.Seller[]>([]);
  const [brandName, setBrandName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    sellerApi.listSellers().then(setSellers).catch(() => setSellers([]));
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const seller = sellers.find((s) => s.name.toLowerCase() === brandName.trim().toLowerCase());
    if (!seller || password !== DEMO_PASSWORD) {
      setError("Invalid brand name or password.");
      setLoading(false);
      return;
    }

    onLogin({ sellerId: seller.sellerId, name: seller.name });
  }

  return (
    <div className="seller-login">
      <div className="seller-login__card">
        <button className="seller-login__back" onClick={() => onSwitchView("storefront")}>
          ← Storefront
        </button>
        <h1>Seller Login</h1>
        <p className="seller-login__note">
          Demo login only - no real accounts. Password is <code>{DEMO_PASSWORD}</code> for every brand below.
        </p>
        <form onSubmit={handleSubmit}>
          <label>
            Brand name
            <input
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              placeholder="e.g. Nike"
              autoFocus
            />
          </label>
          <label>
            Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            Log in
          </button>
        </form>
        {sellers.length > 0 && (
          <p className="seller-login__hint">Available brands: {sellers.map((s) => s.name).join(", ")}</p>
        )}
      </div>
    </div>
  );
}
