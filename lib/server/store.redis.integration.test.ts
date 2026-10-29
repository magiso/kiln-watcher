import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { describeStoreContract } from "./store.contract";
import { createRedisStore, redis } from "./redis";

// Opt-in: `npm run test:integration`. Uses the credentials in .env.local and a
// throwaway key prefix, and deletes its keys afterwards (docs/TESTING.md).
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

describeStoreContract("redis", async (options) => {
  const prefix = `test:${randomUUID()}:`;
  return {
    store: createRedisStore(redis(), prefix, options),
    cleanup: async () => {
      await redis().del(`${prefix}latest`, `${prefix}history`);
    },
  };
});
