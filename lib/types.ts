// Shared types for the device → API → frontend contract. See docs/PLAN.md "API contract".

export type KilnState = "CLOSED" | "OPEN_FULL" | "OPEN_EMPTY" | "UNKNOWN";

export type Trigger = "timer" | "button";

/** Body the ESP32 POSTs to /api/readings. */
export interface ReadingInput {
  deviceId: string;
  distanceMm: number;
  spreadMm: number;
  validSamples: number;
  intervalSec: number;
  trigger: Trigger;
}

/** A reading as stored in Redis: input plus server timestamp and computed state. */
export interface StoredReading extends ReadingInput {
  measuredAt: string;
  state: KilnState;
  reliable: boolean;
}

/** Response of GET /api/status. */
export interface Status {
  message: string;
  state: KilnState;
  distanceMm: number;
  measuredAt: string;
  ageSeconds: number;
  stale: boolean;
  reliable: boolean;
  trigger: Trigger;
}

/** One entry of GET /api/history. */
export type HistoryEntry = Pick<StoredReading, "state" | "distanceMm" | "reliable" | "measuredAt" | "trigger">;
