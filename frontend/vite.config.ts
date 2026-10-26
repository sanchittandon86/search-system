import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Proxies API calls to the backend (src/index.ts, default port 3100) so the
// frontend never needs CORS configuration on the backend and can call
// relative paths like fetch("/products/search") directly.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/products": "http://localhost:3100",
      "/sellers": "http://localhost:3100",
      "/recommendations": "http://localhost:3100",
      "/events": "http://localhost:3100",
      "/health": "http://localhost:3100",
    },
  },
});
