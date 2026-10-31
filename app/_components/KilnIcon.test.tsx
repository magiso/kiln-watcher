// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import type { DisplayState } from "@/lib/domain/types";
import { KilnIcon } from "./KilnIcon";

test.each([
  ["CLOSED", "Kiln closed and firing"],
  ["OPEN_FULL", "Kiln open and full of pots"],
  ["OPEN_EMPTY", "Kiln empty and ready for the next load"],
  ["OFFLINE", "Sensor disconnected"],
] as [DisplayState, string][])("%s has its own labelled artwork", (state, label) => {
  render(<KilnIcon state={state} className="icon" />);
  const svg = screen.getByRole("img", { name: label });
  expect(svg).toHaveAttribute("viewBox", "0 0 334 260");
  expect(svg).toHaveClass("icon");
  // Two circles blend with the card colour behind them (docs/design/README.md#icons).
  const blended = [...svg.querySelectorAll("circle")].filter((c) => c.style.mixBlendMode === "multiply");
  expect(blended).toHaveLength(2);
});

test("carries the kiln-icon class that scopes its motion, with or without a className", () => {
  const { container, rerender } = render(<KilnIcon state="CLOSED" />);
  expect(container.querySelector("svg")).toHaveAttribute("class", "kiln-icon");
  rerender(<KilnIcon state="CLOSED" className="icon" />);
  expect(container.querySelector("svg")).toHaveAttribute("class", "kiln-icon icon");
});
