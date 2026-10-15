import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Фронтенд лежит в web/, в dev-режиме запросы к /reprice проксируются на Express (порт 3001).
export default defineConfig({
  root: "web",
  plugins: [react()],
  server: {
    port: 5173,
    proxy: { "/reprice": "http://localhost:3001" },
  },
  build: { outDir: "../dist/web", emptyOutDir: true },
});
