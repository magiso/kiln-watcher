import { expect, test } from "vitest";
import { formatAge } from "./format";

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
