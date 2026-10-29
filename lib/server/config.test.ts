import { describe, expect, test } from "vitest";
import { loadConfig } from "./config";

describe("loadConfig", () => {
  test("uses defaults when nothing is set", () => {
    expect(loadConfig({})).toEqual({
      tLidMm: 300,
      tEmptyMm: 700,
      offlineAfterHours: 24,
      deviceKey: undefined,
      keyPrefix: "kiln:",
    });
  });

  test("reads every variable", () => {
    const config = loadConfig({
      T_LID: "450",
      T_EMPTY: " 900 ",
      OFFLINE_AFTER_HOURS: "12",
      DEVICE_KEY: " secret ",
      KEY_PREFIX: "dev:kiln:",
    });
    expect(config).toEqual({
      tLidMm: 450,
      tEmptyMm: 900,
      offlineAfterHours: 12,
      deviceKey: "secret",
      keyPrefix: "dev:kiln:",
    });
  });

  test("treats blank values as unset", () => {
    expect(loadConfig({ T_LID: "", DEVICE_KEY: "  ", KEY_PREFIX: "" })).toMatchObject({
      tLidMm: 300,
      deviceKey: undefined,
      keyPrefix: "kiln:",
    });
  });

  test.each([
    ["T_LID", "abc"],
    ["T_EMPTY", "0"],
    ["OFFLINE_AFTER_HOURS", "-1"],
  ])("rejects %s=%s", (name, value) => {
    expect(() => loadConfig({ [name]: value })).toThrow(`${name} must be a positive number`);
  });

  test("rejects T_LID at or above T_EMPTY", () => {
    expect(() => loadConfig({ T_LID: "700", T_EMPTY: "700" })).toThrow("T_LID (700) must be less than T_EMPTY (700)");
  });
});
