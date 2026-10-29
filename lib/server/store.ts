import "server-only";
import type { StoredReading } from "@/lib/domain/types";

/** History keeps about 2–4 months of readings at 4–8 a day. */
export const HISTORY_LIMIT = 500;

export interface StoreOptions {
  historyLimit?: number;
}

export interface ReadingStore {
  /** Makes the reading the latest and adds it to the front of the capped history. */
  save(reading: StoredReading): Promise<void>;
  latest(): Promise<StoredReading | null>;
  /** Up to `limit` readings, newest first. */
  history(limit: number): Promise<StoredReading[]>;
}

/** In-memory store with the same behaviour as the Redis one. Used by tests. */
export function createMemoryStore({ historyLimit = HISTORY_LIMIT }: StoreOptions = {}): ReadingStore {
  let latest: StoredReading | null = null;
  let history: StoredReading[] = [];
  return {
    async save(reading) {
      latest = structuredClone(reading);
      history = [structuredClone(reading), ...history].slice(0, historyLimit);
    },
    async latest() {
      return latest && structuredClone(latest);
    },
    async history(limit) {
      return structuredClone(history.slice(0, limit));
    },
  };
}
