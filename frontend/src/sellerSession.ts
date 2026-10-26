// This is a DEMO-ONLY login gate, not real authentication - there is no
// password field in the sellers table, no backend auth endpoint, and no
// session/token mechanism. The password is a single hardcoded constant
// shared by every seller, purely so a demo can switch between different
// brands' dashboards and see that Products/User Events are genuinely
// scoped per seller. Per readme.txt, complex authentication is explicitly
// out of scope for this project.

export const DEMO_PASSWORD = "Demo@123";

const STORAGE_KEY = "seller_session";

export interface SellerSession {
  sellerId: string;
  name: string;
}

export function getStoredSession(): SellerSession | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SellerSession) : null;
  } catch {
    return null;
  }
}

export function storeSession(session: SellerSession): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(STORAGE_KEY);
}
