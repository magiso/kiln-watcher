import { expect, test } from "vitest";
import { isAuthorized } from "./auth";

test.each([
  ["Bearer secret", true],
  ["Bearer wrong", false],
  ["Bearer secret-but-longer", false],
  ["bearer secret", false],
  ["secret", false],
  ["Bearer ", false],
  ["", false],
  [null, false],
])("%j → %s", (header, expected) => {
  expect(isAuthorized(header, "secret")).toBe(expected);
});
