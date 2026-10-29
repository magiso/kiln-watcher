import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    coverage: {
      provider: "v8",
      include: ["app/**/*.{ts,tsx}", "lib/**/*.{ts,tsx}"],
      // Each exclusion is justified in docs/TESTING.md#coverage.
      exclude: [
        "**/*.test.*",
        "**/*.contract.ts",
        "lib/domain/types.ts",
        "app/api/**/route.ts",
        "app/layout.tsx",
        "lib/server/redis.ts",
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
