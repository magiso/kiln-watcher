// Shared types for the device → API → frontend contract. See docs/ARCHITECTURE.md.

/** What the sensor says about the kiln, from distance alone. */
export type KilnState = "CLOSED" | "OPEN_FULL" | "OPEN_EMPTY";

/** What the page shows: the kiln state, or OFFLINE when there is no recent reading. */
export type DisplayState = KilnState | "OFFLINE";

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

/** A reading as stored: the input plus the server timestamp and the state computed on arrival. */
export interface StoredReading extends ReadingInput {
  measuredAt: string;
  state: KilnState;
}

/** Thresholds and limits the domain logic needs. Built by lib/server/config.ts. */
export interface DomainConfig {
  /** Distances below this (mm) mean the lid is closed. */
  tLidMm: number;
  /** Distances at or above this (mm) mean the kiln is open and empty. */
  tEmptyMm: number;
  /** A reading older than this shows OFFLINE. */
  offlineAfterHours: number;
}

/** Response of GET /api/status. Reading fields are null when no reading has ever arrived. */
export interface Status {
  state: DisplayState;
  offline: boolean;
  headline: string;
  message: string;
  distanceMm: number | null;
  measuredAt: string | null;
  ageSeconds: number | null;
  trigger: Trigger | null;
}
