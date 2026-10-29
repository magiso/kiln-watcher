import type { DomainConfig, KilnState } from "./types";

/** Maps a distance from the sensor to the kiln's state. The sensor looks down into a top-loader. */
export function classify(distanceMm: number, config: Pick<DomainConfig, "tLidMm" | "tEmptyMm">): KilnState {
  if (distanceMm < config.tLidMm) return "CLOSED";
  if (distanceMm < config.tEmptyMm) return "OPEN_FULL";
  return "OPEN_EMPTY";
}
