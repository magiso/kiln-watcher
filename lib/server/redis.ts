import "server-only";
import { Redis } from "@upstash/redis";
import type { StoredReading } from "@/lib/domain/types";
import { HISTORY_LIMIT, type ReadingStore, type StoreOptions } from "./store";

let client: Redis | undefined;

// Created on first use so builds without Upstash env vars still succeed.
// The Vercel integration was added with the "KILN_STORAGE" prefix; the unprefixed
// KV_* / UPSTASH_REDIS_* names are accepted as fallbacks.
export function redis(): Redis {
  if (!client) {
    const env = process.env;
    const url = env.KILN_STORAGE_KV_REST_API_URL ?? env.KV_REST_API_URL ?? env.UPSTASH_REDIS_REST_URL;
    const token = env.KILN_STORAGE_KV_REST_API_TOKEN ?? env.KV_REST_API_TOKEN ?? env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) throw new Error("Upstash Redis env vars are not set");
    client = new Redis({ url, token });
  }
  return client;
}

/** Redis-backed store: `<prefix>latest` (JSON) and `<prefix>history` (capped list, newest first). */
export function createRedisStore(
  db: Redis,
  prefix: string,
  { historyLimit = HISTORY_LIMIT }: StoreOptions = {},
): ReadingStore {
  const latestKey = `${prefix}latest`;
  const historyKey = `${prefix}history`;
  return {
    async save(reading) {
      await db
        .multi()
        .set(latestKey, reading)
        .lpush(historyKey, reading)
        .ltrim(historyKey, 0, historyLimit - 1)
        .exec();
    },
    async latest() {
      return (await db.get<StoredReading>(latestKey)) ?? null;
    },
    async history(limit) {
      return db.lrange<StoredReading>(historyKey, 0, limit - 1);
    },
  };
}
