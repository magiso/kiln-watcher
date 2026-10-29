import type { DisplayState } from "./types";

/** Design copy per display state (docs/design/README.md#copy). */
export const COPY: Record<DisplayState, { headline: string; message: string }> = {
  CLOSED: { headline: "HOT.", message: "The kiln is closed and firing. Look, don't touch." },
  OPEN_FULL: { headline: "FULL.", message: "The kiln is open and full. It'll be unloaded soon!" },
  OPEN_EMPTY: { headline: "EMPTY.", message: "All clear and ready for the next load. Shelve your pieces!" },
  OFFLINE: { headline: "OFFLINE.", message: "Engineering troubleshooting required!" },
};
