import { expect, test } from "vitest";
import { DUE_GRACE_SECONDS, formatAge, formatNextReading } from "./format";

test.each([
  [0, "just now"],
  [59, "just now"],
  [60, "1 min ago"],
  [3599, "59 min ago"],
  [3600, "1 h ago"],
  [47 * 3600 + 3599, "47 h ago"],
  [48 * 3600, "2 days ago"],
  [10 * 86400, "10 days ago"],
])("%i s → %s", (seconds, expected) => {
  expect(formatAge(seconds)).toBe(expected);
});

test.each([
  [-DUE_GRACE_SECONDS - 1, "overdue"],
  [-DUE_GRACE_SECONDS, "due now"],
  [0, "due now"],
  [59, "due now"],
  [60, "in 1 min"],
  [3599, "in 59 min"],
  [3600, "in 1 h"],
  [4 * 3600, "in 4 h"],
  [48 * 3600, "in 2 days"],
])("next reading in %i s → %s", (seconds, expected) => {
  expect(formatNextReading(seconds)).toBe(expected);
});
