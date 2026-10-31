import { beforeEach, describe, expect, test, vi } from "vitest";
import { makeInput, makeReading, testConfig } from "@/test/builders";
import type { Deps } from "./handlers";
import { getStatus, loadStatus, postReading } from "./handlers";
import { createMemoryStore, type ReadingStore } from "./store";

const NOW = new Date("2026-10-28T06:00:00.000Z");

function makeDeps(overrides: Partial<Deps> = {}): Deps {
  return {
    store: createMemoryStore(),
    config: { ...testConfig, deviceKey: "secret", keyPrefix: "test:" },
    now: () => NOW,
    ...overrides,
  };
}

function post(body: unknown, auth: string | null = "Bearer secret") {
  return new Request("http://localhost/api/readings", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(auth ? { Authorization: auth } : {}) },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const failingStore: ReadingStore = {
  save: () => Promise.reject(new Error("down")),
  latest: () => Promise.reject(new Error("down")),
  history: () => Promise.reject(new Error("down")),
};

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("postReading", () => {
  test("stores a valid reading with server time and computed state, and returns 204", async () => {
    const deps = makeDeps();
    const response = await postReading(post(makeInput({ distanceMm: 120 })), deps);

    expect(response.status).toBe(204);
    expect(await response.text()).toBe("");
    const stored = { ...makeInput({ distanceMm: 120 }), measuredAt: NOW.toISOString(), state: "CLOSED" };
    expect(await deps.store.latest()).toEqual(stored);
    expect(await deps.store.history(10)).toEqual([stored]);
  });

  test.each([
    ["no header", null],
    ["a wrong key", "Bearer nope"],
    ["a non-bearer scheme", "Basic secret"],
  ])("returns 401 for %s and stores nothing", async (_, auth) => {
    const deps = makeDeps();
    const response = await postReading(post(makeInput(), auth), deps);
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
    expect(await deps.store.latest()).toBeNull();
  });

  test("checks the key before reading the body", async () => {
    const response = await postReading(post("not json", "Bearer nope"), makeDeps());
    expect(response.status).toBe(401);
  });

  test("returns 500 when DEVICE_KEY is not configured", async () => {
    const deps = makeDeps({ config: { ...testConfig, deviceKey: undefined, keyPrefix: "test:" } });
    const response = await postReading(post(makeInput()), deps);
    expect(response.status).toBe(500);
    expect(await deps.store.latest()).toBeNull();
  });

  test("returns 400 for malformed JSON", async () => {
    const response = await postReading(post("{not json"), makeDeps());
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid body", details: ["body must be valid JSON"] });
  });

  test("returns 400 with the validation errors for an invalid reading", async () => {
    const deps = makeDeps();
    const response = await postReading(post(makeInput({ trigger: "manual" as never })), deps);
    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "invalid body", details: ["trigger must be one of: timer, button"] });
    expect(await deps.store.latest()).toBeNull();
  });

  test("returns 503 when storage fails", async () => {
    const response = await postReading(post(makeInput()), makeDeps({ store: failingStore }));
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({ error: "storage unavailable" });
  });
});

describe("getStatus", () => {
  test("returns OFFLINE when no reading has ever arrived", async () => {
    const response = await getStatus(makeDeps());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toMatchObject({ state: "OFFLINE", offline: true, measuredAt: null });
  });

  test("returns the latest reading's status", async () => {
    const deps = makeDeps();
    await deps.store.save(makeReading({ measuredAt: "2026-10-28T04:30:00.000Z", state: "OPEN_FULL" }));
    expect(await (await getStatus(deps)).json()).toEqual({
      state: "OPEN_FULL",
      offline: false,
      headline: "FULL.",
      message: "The kiln is open and full. It'll be unloaded soon!",
      distanceMm: 482,
      measuredAt: "2026-10-28T04:30:00.000Z",
      ageSeconds: 5400,
      nextReadingInSeconds: 9000,
      trigger: "timer",
    });
  });

  test("returns 503 when storage fails", async () => {
    const response = await getStatus(makeDeps({ store: failingStore }));
    expect(response.status).toBe(503);
  });
});

describe("loadStatus", () => {
  test("reflects a reading posted through postReading", async () => {
    const deps = makeDeps();
    await postReading(post(makeInput({ distanceMm: 900 })), deps);
    expect(await loadStatus(deps)).toMatchObject({ state: "OPEN_EMPTY", headline: "EMPTY.", ageSeconds: 0 });
  });
});
