import { describe, expect, test } from "vitest";
import { makeReading, testConfig } from "@/test/builders";
import { toStatus } from "./status";

const measuredAt = "2026-10-28T00:00:00.000Z";
const after = (seconds: number) => new Date(Date.parse(measuredAt) + seconds * 1000);
const DAY = 24 * 3600;

describe("toStatus", () => {
  test("is OFFLINE with null reading fields when no reading has ever arrived", () => {
    expect(toStatus(null, after(0), testConfig)).toEqual({
      state: "OFFLINE",
      offline: true,
      headline: "OFFLINE.",
      message: "Engineering troubleshooting required!",
      distanceMm: null,
      measuredAt: null,
      ageSeconds: null,
      trigger: null,
    });
  });

  test("shows the stored kiln state with design copy while fresh", () => {
    const reading = makeReading({ measuredAt, state: "CLOSED", distanceMm: 120, trigger: "button" });
    expect(toStatus(reading, after(5400), testConfig)).toEqual({
      state: "CLOSED",
      offline: false,
      headline: "HOT.",
      message: "The kiln is closed and firing. Look, don't touch.",
      distanceMm: 120,
      measuredAt,
      ageSeconds: 5400,
      trigger: "button",
    });
  });

  test.each([
    [DAY - 1, false],
    [DAY, false],
    [DAY + 1, true],
    [3 * DAY, true],
  ])("at %i s old, offline is %s", (age, offline) => {
    const status = toStatus(makeReading({ measuredAt, state: "OPEN_EMPTY" }), after(age), testConfig);
    expect(status.offline).toBe(offline);
    expect(status.state).toBe(offline ? "OFFLINE" : "OPEN_EMPTY");
    expect(status.ageSeconds).toBe(age);
  });

  test("keeps the last reading's details when offline", () => {
    const status = toStatus(makeReading({ measuredAt, distanceMm: 482 }), after(2 * DAY), testConfig);
    expect(status).toMatchObject({ headline: "OFFLINE.", distanceMm: 482, measuredAt, ageSeconds: 2 * DAY });
  });

  test("uses the configured offline window", () => {
    const status = toStatus(makeReading({ measuredAt }), after(2 * 3600), { offlineAfterHours: 1 });
    expect(status.state).toBe("OFFLINE");
  });

  test("rounds age down to whole seconds and never goes negative", () => {
    const reading = makeReading({ measuredAt });
    expect(toStatus(reading, after(1.9), testConfig).ageSeconds).toBe(1);
    expect(toStatus(reading, after(-30), testConfig).ageSeconds).toBe(0);
  });
});
