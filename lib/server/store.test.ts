import { expect, test } from "vitest";
import { makeReading } from "@/test/builders";
import { describeStoreContract } from "./store.contract";
import { createMemoryStore } from "./store";

describeStoreContract("memory", async (options) => ({ store: createMemoryStore(options) }));

test("memory store copies readings, so callers can't mutate stored data", async () => {
  const store = createMemoryStore();
  const reading = makeReading();
  await store.save(reading);
  reading.distanceMm = 1;
  const latest = await store.latest();
  latest!.distanceMm = 2;
  expect((await store.latest())?.distanceMm).toBe(482);
  expect((await store.history(1))[0].distanceMm).toBe(482);
});
