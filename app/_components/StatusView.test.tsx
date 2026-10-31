// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { toStatus } from "@/lib/domain/status";
import type { Status } from "@/lib/domain/types";
import { makeReading, testConfig } from "@/test/builders";
import { REFRESH_INTERVAL_MS, StatusView } from "./StatusView";

const NOW = new Date("2026-10-28T06:00:00.000Z");
const full = toStatus(makeReading({ state: "OPEN_FULL", measuredAt: "2026-10-28T05:00:00.000Z" }), NOW, testConfig);
const empty = toStatus(makeReading({ state: "OPEN_EMPTY", measuredAt: "2026-10-28T05:59:30.000Z" }), NOW, testConfig);

const fetchMock = vi.fn<typeof fetch>();
const ok = (status: Status) => Promise.resolve(Response.json(status));
const headline = () => screen.getByRole("heading", { level: 1 });

function setVisibility(state: DocumentVisibilityState) {
  Object.defineProperty(document, "visibilityState", { value: state, configurable: true });
  document.dispatchEvent(new Event("visibilitychange"));
}

// Leave the tab and come back, which triggers a refresh.
async function returnToTab() {
  act(() => setVisibility("hidden"));
  await act(async () => setVisibility("visible"));
}

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  setVisibility("visible");
});
afterEach(() => {
  fetchMock.mockReset();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("StatusView", () => {
  test("renders the initial status without fetching", () => {
    render(<StatusView initial={full} />);
    expect(headline()).toHaveTextContent("FULL.");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("a refresh fetches /api/status and shows the new state", async () => {
    fetchMock.mockReturnValueOnce(ok(empty));
    render(<StatusView initial={full} />);
    await returnToTab();
    expect(fetchMock).toHaveBeenCalledWith("/api/status", { cache: "no-store" });
    expect(headline()).toHaveTextContent("EMPTY.");
    expect(screen.getAllByText("Checked just now")).toHaveLength(2);
  });

  test.each([
    ["an error response", () => Promise.resolve(new Response(null, { status: 503 }))],
    ["a network failure", () => Promise.reject(new TypeError("offline"))],
  ])("keeps the last status and says so after %s", async (_, response) => {
    fetchMock.mockImplementationOnce(response);
    render(<StatusView initial={full} />);
    await returnToTab();
    expect(headline()).toHaveTextContent("FULL.");
    expect(screen.getAllByText("Couldn't refresh")).toHaveLength(2);
  });

  test("a successful refresh clears the failure", async () => {
    fetchMock.mockRejectedValueOnce(new TypeError("offline")).mockReturnValueOnce(ok(full));
    render(<StatusView initial={full} />);
    await returnToTab();
    expect(screen.getAllByText("Couldn't refresh")).toHaveLength(2);
    await returnToTab();
    expect(screen.queryByText("Couldn't refresh")).not.toBeInTheDocument();
  });

  test("shows OFFLINE when the initial load failed", () => {
    render(<StatusView initial={null} />);
    expect(headline()).toHaveTextContent("OFFLINE.");
    expect(screen.getAllByText("Couldn't refresh")).toHaveLength(2);
  });

  test("refreshes every few minutes while the tab is visible, and not while hidden", async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation(() => ok(empty));
    render(<StatusView initial={full} />);

    await act(() => vi.advanceTimersByTimeAsync(REFRESH_INTERVAL_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(headline()).toHaveTextContent("EMPTY.");

    act(() => setVisibility("hidden"));
    await act(() => vi.advanceTimersByTimeAsync(3 * REFRESH_INTERVAL_MS));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  test("refreshes when the tab becomes visible again", async () => {
    fetchMock.mockImplementation(() => ok(empty));
    render(<StatusView initial={full} />);
    act(() => setVisibility("hidden"));
    expect(fetchMock).not.toHaveBeenCalled();
    await act(async () => setVisibility("visible"));
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(headline()).toHaveTextContent("EMPTY.");
  });

  test("stops polling after unmount", async () => {
    vi.useFakeTimers();
    const { unmount } = render(<StatusView initial={full} />);
    unmount();
    await vi.advanceTimersByTimeAsync(2 * REFRESH_INTERVAL_MS);
    setVisibility("visible");
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
