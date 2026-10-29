import "server-only";
import { parseReadingInput } from "@/lib/domain/reading";
import { classify } from "@/lib/domain/state";
import { toStatus } from "@/lib/domain/status";
import type { Status, StoredReading } from "@/lib/domain/types";
import { isAuthorized } from "./auth";
import type { ServerConfig } from "./config";
import type { ReadingStore } from "./store";

export interface Deps {
  store: ReadingStore;
  config: ServerConfig;
  now: () => Date;
}

const json = (body: unknown, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** POST /api/readings: authenticate the device, validate, stamp, classify and store. */
export async function postReading(request: Request, deps: Deps): Promise<Response> {
  const { deviceKey } = deps.config;
  if (!deviceKey) {
    console.error("DEVICE_KEY is not set; refusing device readings");
    return json({ error: "server not configured" }, 500);
  }
  if (!isAuthorized(request.headers.get("authorization"), deviceKey)) {
    return json({ error: "unauthorized" }, 401);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid body", details: ["body must be valid JSON"] }, 400);
  }
  const parsed = parseReadingInput(body);
  if (!parsed.ok) return json({ error: "invalid body", details: parsed.errors }, 400);

  const reading: StoredReading = {
    ...parsed.value,
    measuredAt: deps.now().toISOString(),
    state: classify(parsed.value.distanceMm, deps.config),
  };
  try {
    await deps.store.save(reading);
  } catch (error) {
    console.error("Failed to store reading", error);
    return json({ error: "storage unavailable" }, 503);
  }
  return new Response(null, { status: 204 });
}

/** The current status, for the page and GET /api/status. Throws if storage is unavailable. */
export async function loadStatus(deps: Deps): Promise<Status> {
  return toStatus(await deps.store.latest(), deps.now(), deps.config);
}

/** GET /api/status. */
export async function getStatus(deps: Deps): Promise<Response> {
  try {
    return json(await loadStatus(deps), 200);
  } catch (error) {
    console.error("Failed to load status", error);
    return json({ error: "storage unavailable" }, 503);
  }
}
