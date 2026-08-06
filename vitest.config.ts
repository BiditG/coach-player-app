import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "."),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/unit/**/*.test.{ts,tsx}", "tests/integration/**/*.test.{ts,tsx}"],
    exclude: ["node_modules", ".next", "tests/e2e"],
    coverage: {
      provider: "v8",
      include: ["app/**", "components/**", "utils/**", "lib/**"],
      exclude: ["node_modules", ".next", "tests"],
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 75,
        statements: 70,
        autoUpdate: true,
      },
    },
  },
});
