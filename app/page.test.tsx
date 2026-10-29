import { isValidElement, Suspense } from "react";
import { expect, test } from "vitest";
import { LiveStatus } from "./_components/LiveStatus";
import Home from "./page";

test("streams the live status inside a Suspense boundary", () => {
  const page = Home();
  expect(page.type).toBe(Suspense);
  const child = page.props.children;
  expect(isValidElement(child) && child.type).toBe(LiveStatus);
});
