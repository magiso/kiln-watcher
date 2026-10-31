// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { NO_READING_STATUS, toStatus } from "@/lib/domain/status";
import type { KilnState, Status } from "@/lib/domain/types";
import { makeReading, testConfig } from "@/test/builders";
import { StatusCard, type StatusCardProps } from "./StatusCard";

const NOW = new Date("2026-10-28T06:00:00.000Z");
const statusFor = (state: KilnState, ageSeconds = 7200): Status =>
  toStatus(makeReading({ state, measuredAt: new Date(NOW.getTime() - ageSeconds * 1000).toISOString() }), NOW, testConfig);

function renderCard(props: Partial<StatusCardProps> = {}) {
  render(<StatusCard status={statusFor("OPEN_FULL")} failed={false} {...props} />);
}

const card = () => document.querySelector("main")!;

describe("StatusCard", () => {
  test.each([
    ["CLOSED", "HOT.", "The kiln is closed and firing. Look, don't touch.", "bg-closed", "Kiln closed and firing"],
    ["OPEN_FULL", "FULL.", "The kiln is open and full. It'll be unloaded soon!", "bg-full", "Kiln open and full of pots"],
    ["OPEN_EMPTY", "EMPTY.", "All clear and ready for the next load. Shelve your pieces!", "bg-empty", "Kiln empty and ready for the next load"],
  ] as const)("%s shows %s with its copy, colour and icon", (state, headline, message, colour, icon) => {
    renderCard({ status: statusFor(state) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(headline);
    expect(screen.getByText(message)).toBeInTheDocument();
    expect(card()).toHaveClass(colour);
    expect(card()).toHaveAttribute("data-state", state);
    expect(screen.getByRole("img", { name: icon })).toBeInTheDocument();
    expect(screen.getByText("KILN STATUS")).toBeInTheDocument();
    expect(screen.queryByText("SENSOR DISCONNECTED")).not.toBeInTheDocument();
  });

  test("shows how long ago the kiln was checked, and no buttons", () => {
    renderCard({ status: statusFor("CLOSED", 7200) });
    // Rendered twice: in the desktop header and the mobile footer; CSS shows one.
    expect(screen.getAllByText("Checked 2 h ago")).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("OFFLINE uses the disconnected design with the last reading's age", () => {
    renderCard({ status: statusFor("OPEN_FULL", 50 * 3600) });
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent("OFFLINE.");
    expect(screen.getByText("Engineering troubleshooting required!")).toBeInTheDocument();
    expect(screen.getByText("SENSOR DISCONNECTED")).toBeInTheDocument();
    expect(screen.queryByText("KILN STATUS")).not.toBeInTheDocument();
    expect(card()).toHaveClass("bg-offline");
    expect(screen.getByRole("img", { name: "Sensor disconnected" })).toBeInTheDocument();
    expect(screen.getAllByText("Last reading 2 days ago")).toHaveLength(2);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  test("OFFLINE with no reading ever says so", () => {
    renderCard({ status: NO_READING_STATUS });
    expect(screen.getAllByText("No readings yet")).toHaveLength(2);
  });

  test("after a failed refresh it says so", () => {
    renderCard({ status: NO_READING_STATUS, failed: true });
    expect(screen.getAllByText("Couldn't refresh")).toHaveLength(2);
  });
});
