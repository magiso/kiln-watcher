import { COPY } from "./copy";
import type { DomainConfig, Status, StoredReading } from "./types";

/** OFFLINE with no reading details: nothing has ever arrived, or the status couldn't be loaded. */
export const NO_READING_STATUS: Status = {
  state: "OFFLINE",
  offline: true,
  ...COPY.OFFLINE,
  distanceMm: null,
  measuredAt: null,
  ageSeconds: null,
  nextReadingInSeconds: null,
  trigger: null,
};

/**
 * Builds the status the page shows. OFFLINE when no reading has ever arrived
 * or the latest is more than `offlineAfterHours` old.
 */
export function toStatus(
  latest: StoredReading | null,
  now: Date,
  config: Pick<DomainConfig, "offlineAfterHours">,
): Status {
  if (!latest) return NO_READING_STATUS;

  const sinceReading = (now.getTime() - Date.parse(latest.measuredAt)) / 1000;
  // Clamp at zero so a small clock skew never produces a negative age.
  const ageSeconds = Math.max(0, Math.floor(sinceReading));
  const offline = ageSeconds > config.offlineAfterHours * 3600;
  const state = offline ? "OFFLINE" : latest.state;

  return {
    state,
    offline,
    ...COPY[state],
    distanceMm: latest.distanceMm,
    measuredAt: latest.measuredAt,
    ageSeconds,
    nextReadingInSeconds: Math.ceil(latest.intervalSec - sinceReading),
    trigger: latest.trigger,
  };
}
