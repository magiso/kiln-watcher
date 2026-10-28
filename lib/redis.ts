import { Redis } from "@upstash/redis";

let client: Redis | undefined;

// Created on first use so builds without Upstash env vars still succeed.
// fromEnv() reads KV_REST_API_URL/TOKEN (Vercel integration) or UPSTASH_REDIS_REST_URL/TOKEN.
export function redis(): Redis {
  return (client ??= Redis.fromEnv());
}

export const KEYS = {
  latest: "kiln:latest",
  history: "kiln:history",
} as const;
