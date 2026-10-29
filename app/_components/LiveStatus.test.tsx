// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { Deps } from "@/lib/server/handlers";
import { createMemoryStore } from "@/lib/server/store";
import { makeReading, testConfig } from "@/test/builders";
import { LiveStatus } from "./LiveStatus";

const deps = vi.hoisted(() => ({ current: undefined as Deps | undefined }));
vi.mock("next/server", () => ({ connection: vi.fn(async () => {}) }));
vi.mock("@/lib/server/deps", () => ({ defaultDeps: () => deps.current }));

const NOW = new Date("2026-10-28T06:00:00.000Z");

beforeEach(() => {
  deps.current = {
    store: createMemoryStore(),
    config: { ...testConfig, deviceKey: "secret", keyPrefix: "test:" },
    now: () => NOW,
  };
});

describe("LiveStatus", () => {
  test("renders the stored status on the server", async () => {
    await deps.current!.store.save(makeReading({ state: "CLOSED", measuredAt: "2026-10-28T05:00:00.000Z" }));
    render(await LiveStatus());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("HOT.");
    expect(screen.getAllByText("Checked 1 h ago")).toHaveLength(2);
  });

  test("renders OFFLINE with a retry when storage is unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    deps.current!.store.latest = () => Promise.reject(new Error("down"));
    render(await LiveStatus());
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("OFFLINE.");
    expect(screen.getAllByText("Couldn't refresh")).toHaveLength(2);
  });
});
