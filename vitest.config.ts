import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ESM-safe equivalent of __dirname for resolving the alias anchor.
const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * Vitest configuration for Fintracko.
 *
 * Aligns with docs/core/AGENT_RULES.md §4 (Mandatory Unit Testing) and
 * docs/core/PROJECT_STRUCTURE.md §3 (Co-located Automated Unit Testing).
 *
 * - Environment: jsdom (DOM APIs available for React Testing Library)
 * - Globals: `describe`, `it`, `expect`, etc. are available without imports
 * - Alias: `@/*` mirrors tsconfig.json paths -> ./src/*
 * - Setup: src/test/setup.ts registers @testing-library/jest-dom matchers
 * - Include: only co-located *.test.ts(x) files are picked up, per the
 *   "tests sit next to their targets" rule. node_modules and .next are excluded.
 *
 * Note: Vitest is pinned to v3.x (not v4) in package.json because v4+'s test-runner
 * module resolution breaks `import ... from "vitest"` in test files against the
 * Vite/Node generation shipped with Next.js 16. Bump deliberately, with re-verification.
 */
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.ts", "src/**/*.test.tsx"],
    exclude: ["node_modules", ".next", "build", "out"],
    css: false,
  },
});
