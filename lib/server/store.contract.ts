import { afterEach, describe, expect, test } from "vitest";
import { makeReading } from "@/test/builders";
import type { ReadingStore, StoreOptions } from "./store";

export interface StoreHarness {
  store: ReadingStore;
  cleanup?: () => Promise<void>;
}

/** Behaviour every ReadingStore must have. Runs against the in-memory and Redis stores. */
export function describeStoreContract(name: string, make: (options: StoreOptions) => Promise<StoreHarness>) {
  describe(`${name} store contract`, () => {
    let cleanup: (() => Promise<void>) | undefined;
    const setup = async (options: StoreOptions = {}) => {
      const harness = await make(options);
      cleanup = harness.cleanup;
      return harness.store;
    };
    afterEach(async () => {
      await cleanup?.();
      cleanup = undefined;
    });

    test("starts empty", async () => {
      const store = await setup();
      expect(await store.latest()).toBeNull();
      expect(await store.history(10)).toEqual([]);
    });

    test("round-trips a reading", async () => {
      const store = await setup();
      const reading = makeReading();
      await store.save(reading);
      expect(await store.latest()).toEqual(reading);
      expect(await store.history(10)).toEqual([reading]);
    });

    test("latest is the most recent save and history is newest first", async () => {
      const store = await setup();
      const first = makeReading({ distanceMm: 100, state: "CLOSED" });
      const second = makeReading({ distanceMm: 800, state: "OPEN_EMPTY" });
      await store.save(first);
      await store.save(second);
      expect(await store.latest()).toEqual(second);
      expect(await store.history(10)).toEqual([second, first]);
    });

    test("caps history at the limit, dropping the oldest", async () => {
      const store = await setup({ historyLimit: 3 });
      const readings = [1, 2, 3, 4].map((n) => makeReading({ distanceMm: n * 100 }));
      for (const reading of readings) await store.save(reading);
      expect((await store.history(10)).map((r) => r.distanceMm)).toEqual([400, 300, 200]);
    });

    test("returns at most the requested number of history entries", async () => {
      const store = await setup();
      for (const n of [1, 2, 3]) await store.save(makeReading({ distanceMm: n }));
      expect((await store.history(2)).map((r) => r.distanceMm)).toEqual([3, 2]);
    });
  });
}
