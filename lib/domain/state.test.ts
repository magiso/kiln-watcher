import { describe, expect, test } from "vitest";
import { testConfig } from "@/test/builders";
import { classify } from "./state";

describe("classify", () => {
  test.each([
    [0, "CLOSED"],
    [299, "CLOSED"],
    [300, "OPEN_FULL"],
    [301, "OPEN_FULL"],
    [699, "OPEN_FULL"],
    [700, "OPEN_EMPTY"],
    [701, "OPEN_EMPTY"],
    [4000, "OPEN_EMPTY"],
  ] as const)("%i mm is %s", (distanceMm, expected) => {
    expect(classify(distanceMm, testConfig)).toBe(expected);
  });

  test("uses the thresholds it is given", () => {
    expect(classify(450, { tLidMm: 500, tEmptyMm: 900 })).toBe("CLOSED");
  });
});
