import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Proxies API calls to the backend so the frontend never needs CORS
// configuration and can call relative paths like fetch("/products/search")
// directly. Defaults to localhost:3100 for local dev; overridden to the
// Docker Compose service name (http://backend:3100) via BACKEND_URL when
// running in containers, since "localhost" inside the frontend container
// would refer to itself, not the backend container.
const backendUrl = process.env.BACKEND_URL ?? "http://localhost:3100";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/products": backendUrl,
      "/sellers": backendUrl,
      "/recommendations": backendUrl,
      "/events": backendUrl,
      "/health": backendUrl,
    },
  },
});
