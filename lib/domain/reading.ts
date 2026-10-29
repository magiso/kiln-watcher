import type { ReadingInput, Trigger } from "./types";

export type ParseResult = { ok: true; value: ReadingInput } | { ok: false; errors: string[] };

const TRIGGERS: readonly Trigger[] = ["timer", "button"];

// The HC-SR04 reads up to about 4 m; anything far beyond that is a bad payload.
const MAX_DISTANCE_MM = 10_000;
const MAX_DEVICE_ID_LENGTH = 64;

const isNumber = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);
const isNonNegativeInteger = (v: unknown): v is number => Number.isInteger(v) && (v as number) >= 0;

/** Validates a device payload. Unknown fields are dropped. */
export function parseReadingInput(body: unknown): ParseResult {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return { ok: false, errors: ["body must be a JSON object"] };
  }
  const b = body as Record<string, unknown>;
  const errors: string[] = [];

  if (typeof b.deviceId !== "string" || b.deviceId.length === 0 || b.deviceId.length > MAX_DEVICE_ID_LENGTH) {
    errors.push(`deviceId must be a string of 1–${MAX_DEVICE_ID_LENGTH} characters`);
  }
  if (!isNumber(b.distanceMm) || b.distanceMm < 0 || b.distanceMm > MAX_DISTANCE_MM) {
    errors.push(`distanceMm must be a number from 0 to ${MAX_DISTANCE_MM}`);
  }
  if (!isNumber(b.spreadMm) || b.spreadMm < 0) {
    errors.push("spreadMm must be a non-negative number");
  }
  if (!isNonNegativeInteger(b.validSamples)) {
    errors.push("validSamples must be a non-negative integer");
  }
  if (!isNonNegativeInteger(b.intervalSec) || b.intervalSec === 0) {
    errors.push("intervalSec must be a positive integer");
  }
  if (!TRIGGERS.includes(b.trigger as Trigger)) {
    errors.push(`trigger must be one of: ${TRIGGERS.join(", ")}`);
  }

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    value: {
      deviceId: b.deviceId as string,
      distanceMm: b.distanceMm as number,
      spreadMm: b.spreadMm as number,
      validSamples: b.validSamples as number,
      intervalSec: b.intervalSec as number,
      trigger: b.trigger as Trigger,
    },
  };
}
