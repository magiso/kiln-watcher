import { describe, expect, test } from "vitest";
import { makeInput } from "@/test/builders";
import { parseReadingInput } from "./reading";

describe("parseReadingInput", () => {
  test("accepts a valid payload", () => {
    expect(parseReadingInput(makeInput())).toEqual({ ok: true, value: makeInput() });
  });

  test("accepts a button reading and boundary values", () => {
    const input = makeInput({ trigger: "button", distanceMm: 0, spreadMm: 0, validSamples: 0, intervalSec: 1 });
    expect(parseReadingInput(input)).toEqual({ ok: true, value: input });
  });

  test("drops unknown fields", () => {
    const result = parseReadingInput({ ...makeInput(), measuredAt: "2020-01-01", extra: 1 });
    expect(result).toEqual({ ok: true, value: makeInput() });
  });

  test.each([null, "text", 42, [makeInput()]])("rejects a non-object body: %j", (body) => {
    expect(parseReadingInput(body)).toEqual({ ok: false, errors: ["body must be a JSON object"] });
  });

  test.each([
    ["deviceId", ""],
    ["deviceId", "x".repeat(65)],
    ["deviceId", 7],
    ["distanceMm", -1],
    ["distanceMm", 10_001],
    ["distanceMm", "482"],
    ["distanceMm", Number.NaN],
    ["spreadMm", -0.5],
    ["spreadMm", null],
    ["validSamples", 1.5],
    ["validSamples", -1],
    ["intervalSec", 0],
    ["intervalSec", 60.5],
    ["trigger", "manual"],
  ])("rejects %s = %j", (field, value) => {
    const result = parseReadingInput({ ...makeInput(), [field]: value });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toMatch(new RegExp(`^${field} `));
    }
  });

  test("accepts the limits of each range", () => {
    const input = makeInput({ deviceId: "x".repeat(64), distanceMm: 10_000 });
    expect(parseReadingInput(input).ok).toBe(true);
  });

  test("reports every invalid field at once", () => {
    const result = parseReadingInput({});
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.errors).toHaveLength(6);
  });
});
