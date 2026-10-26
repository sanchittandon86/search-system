# Storefront (minimal frontend)

A minimal React + Vite + TypeScript buyer-facing UI for the search-system
backend. Not the focus of this project — see `../readme.txt`'s "FRONTEND"
section for what it does, how it authenticates, and the folder layout.

## Run

```
npm install
npm run dev
```

Opens on http://localhost:5173/ and proxies API calls to the backend on
port 3100 (see `vite.config.ts`). The backend must be running and migrated
first — see `../readme.txt`'s SETUP INSTRUCTIONS.
