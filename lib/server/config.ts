import "server-only";
import type { DomainConfig } from "@/lib/domain/types";

export interface ServerConfig extends DomainConfig {
  /** Undefined when DEVICE_KEY is unset; every device request is then refused. */
  deviceKey: string | undefined;
  /** Prefix for every Redis key, e.g. "kiln:" in production and "dev:kiln:" locally. */
  keyPrefix: string;
}

type Env = Record<string, string | undefined>;

function readPositiveNumber(env: Env, name: string, fallback: number): number {
  const raw = env[name]?.trim();
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${name} must be a positive number, got "${raw}"`);
  return value;
}

/** Reads and validates configuration. Throws on invalid values so a bad deploy fails loudly. */
export function loadConfig(env: Env = process.env): ServerConfig {
  const tLidMm = readPositiveNumber(env, "T_LID", 300);
  const tEmptyMm = readPositiveNumber(env, "T_EMPTY", 700);
  if (tLidMm >= tEmptyMm) throw new Error(`T_LID (${tLidMm}) must be less than T_EMPTY (${tEmptyMm})`);

  return {
    tLidMm,
    tEmptyMm,
    offlineAfterHours: readPositiveNumber(env, "OFFLINE_AFTER_HOURS", 24),
    deviceKey: env.DEVICE_KEY?.trim() || undefined,
    keyPrefix: env.KEY_PREFIX?.trim() || "kiln:",
  };
}
