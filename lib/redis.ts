import { Redis } from "@upstash/redis";

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

export const KEYS = {
  latest: "kiln:latest",
  history: "kiln:history",
} as const;
