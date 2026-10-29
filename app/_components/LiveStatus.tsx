import { connection } from "next/server";
import type { Status } from "@/lib/domain/types";
import { defaultDeps } from "@/lib/server/deps";
import { loadStatus } from "@/lib/server/handlers";
import { StatusView } from "./StatusView";

/** Server component: reads the status at request time so the first paint shows the right card. */
export async function LiveStatus() {
  await connection();
  let initial: Status | null = null;
  try {
    initial = await loadStatus(defaultDeps());
  } catch (error) {
    // StatusView shows "Couldn't refresh" and retries on the next refresh.
    console.error("Failed to load status", error);
  }
  return <StatusView initial={initial} />;
}
