import { fileURLToPath } from "node:url";
import { configDefaults, defineConfig } from "vitest/config";

const root = (path: string) => fileURLToPath(new URL(path, import.meta.url));

// Tests that need real Redis only run under `npm run test:integration`.
const integration = process.env.INTEGRATION === "1";

export default defineConfig({
  resolve: {
    alias: {
      "@": root("."),
      "server-only": root("test/stubs/server-only.ts"),
    },
  },
  test: {
    setupFiles: ["test/setup-dom.ts"],
    include: integration ? ["**/*.integration.test.ts"] : ["**/*.test.{ts,tsx}"],
    exclude: [...configDefaults.exclude, ...(integration ? [] : ["**/*.integration.test.ts"])],
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
        "lib/server/deps.ts",
      ],
      thresholds: { lines: 90, branches: 90, functions: 90, statements: 90 },
    },
  },
});
