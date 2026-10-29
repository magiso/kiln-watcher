import "server-only";
import { loadConfig } from "./config";
import type { Deps } from "./handlers";
import { createRedisStore, redis } from "./redis";

let deps: Deps | undefined;

/** Production wiring: env config, the Redis store and the real clock. */
export function defaultDeps(): Deps {
  if (!deps) {
    const config = loadConfig();
    deps = { config, store: createRedisStore(redis(), config.keyPrefix), now: () => new Date() };
  }
  return deps;
}
