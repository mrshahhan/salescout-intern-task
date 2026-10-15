import { defineConfig } from "vitest/config";

// Отдельный конфиг: vite.config.ts задаёт root: "web" для фронтенда,
// а тесты лежат в корне проекта (tests/, src/, server/).
export default defineConfig({
  test: {
    root: ".",
    include: ["{src,server,tests}/**/*.{test,spec}.ts"],
    environment: "node",
  },
});
