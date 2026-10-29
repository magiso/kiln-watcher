import type { DomainConfig, ReadingInput, StoredReading } from "@/lib/domain/types";

export const testConfig: DomainConfig = { tLidMm: 300, tEmptyMm: 700, offlineAfterHours: 24 };

export function makeInput(overrides: Partial<ReadingInput> = {}): ReadingInput {
  return {
    deviceId: "kiln-1",
    distanceMm: 482,
    spreadMm: 6,
    validSamples: 14,
    intervalSec: 14400,
    trigger: "timer",
    ...overrides,
  };
}

export function makeReading(overrides: Partial<StoredReading> = {}): StoredReading {
  return {
    ...makeInput(),
    measuredAt: "2026-10-28T05:40:00.000Z",
    state: "OPEN_FULL",
    ...overrides,
  };
}
