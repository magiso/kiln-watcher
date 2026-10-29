import { expect, test } from "vitest";
import { COPY } from "./copy";

test("matches the design copy", () => {
  expect(COPY).toEqual({
    CLOSED: { headline: "HOT.", message: "The kiln is closed and firing. Look, don't touch." },
    OPEN_FULL: { headline: "FULL.", message: "The kiln is open and full. It'll be unloaded soon!" },
    OPEN_EMPTY: { headline: "EMPTY.", message: "All clear and ready for the next load. Shelve your pieces!" },
    OFFLINE: { headline: "OFFLINE.", message: "Engineering troubleshooting required!" },
  });
});
