import { formatAge, formatNextReading } from "@/lib/domain/format";
import type { DisplayState, Status } from "@/lib/domain/types";
import { KilnIcon } from "./KilnIcon";

const CARD_COLOUR: Record<DisplayState, string> = {
  CLOSED: "bg-closed",
  OPEN_FULL: "bg-full",
  OPEN_EMPTY: "bg-empty",
  OFFLINE: "bg-offline",
};

// Browser chrome colour on phones, where the card fills the screen. Matches the tokens in globals.css.
const THEME_COLOUR: Record<DisplayState, string> = {
  CLOSED: "#ffb5c8",
  OPEN_FULL: "#a8ddf0",
  OPEN_EMPTY: "#b9e8c4",
  OFFLINE: "#d9ccf7",
};

export interface StatusCardProps {
  status: Status;
  /** The last refresh (or the initial load) failed. */
  failed: boolean;
}

function metaText({ status, failed }: StatusCardProps): string {
  if (failed) return "Couldn't refresh";
  if (status.ageSeconds === null) return "No readings yet";
  return `${status.offline ? "Last reading" : "Checked"} ${formatAge(status.ageSeconds)}`;
}

/** "Next check: in 3 h", shown only while the sensor is reporting (the offline design has none). */
function nextText({ status }: StatusCardProps): string | null {
  if (status.offline || status.nextReadingInSeconds === null) return null;
  return `Next check: ${formatNextReading(status.nextReadingInSeconds)}`;
}

/**
 * The Pastel Riso status card. Below `lg` the card fills the whole screen; from `lg` it is the wide
 * desktop card on the page background.
 */
export function StatusCard(props: StatusCardProps) {
  const { status } = props;
  const meta = metaText(props);
  const next = nextText(props);
  const offline = status.state === "OFFLINE";
  const colour = CARD_COLOUR[status.state];

  return (
    <div className={`min-h-svh ${colour} font-sans text-ink lg:bg-page lg:px-6 lg:pt-10 lg:pb-14`}>
      <meta name="theme-color" content={THEME_COLOUR[status.state]} />
      <div className="mx-auto flex max-w-[420px] flex-col gap-8 lg:max-w-[1160px]">
        <header className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
          <p className="font-display text-[30px] tracking-[0.04em]">PART TIME KILN WATCHER</p>
          <div className="flex items-center gap-5 text-[15px] font-bold">
            <p aria-live="polite">{meta}</p>
            {next && (
              <>
                <span aria-hidden className="h-6 w-[3px] bg-ink" />
                <p>{next}</p>
              </>
            )}
          </div>
        </header>

        <main
          data-state={status.state}
          className={`${colour} flex min-h-svh flex-col gap-4 px-6 py-7 lg:min-h-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-12 lg:rounded-[36px] lg:border-4 lg:border-ink lg:p-12 lg:shadow-[14px_14px_0_var(--color-ink)]`}
        >
          <div className="flex items-baseline justify-between gap-3 lg:hidden">
            <p className="font-display text-xl tracking-[0.04em]">PART TIME KILN WATCHER</p>
            <p className="text-xs font-bold tracking-[0.12em]">STATUS</p>
          </div>

          <div className="flex justify-center lg:min-w-0 lg:flex-[1_1_340px]">
            <KilnIcon state={status.state} className="h-auto w-full max-w-[330px] lg:max-w-[480px]" />
          </div>

          <div className="flex flex-col gap-4 lg:min-w-0 lg:flex-[1_1_340px] lg:gap-[18px]">
            {offline ? (
              <p className="text-[13px] font-bold tracking-[0.14em] lg:text-sm">SENSOR DISCONNECTED</p>
            ) : (
              <p className="hidden text-sm font-bold tracking-[0.14em] lg:block">KILN STATUS</p>
            )}
            <h1
              className={`font-display leading-[0.92] lg:leading-[0.9] ${
                offline ? "text-[min(84px,21vw)] lg:text-[clamp(80px,10vw,150px)]" : "text-[min(100px,25vw)] lg:text-[clamp(88px,11vw,168px)]"
              }`}
            >
              {status.headline}
            </h1>
            <p className="text-[21px] leading-[1.3] font-bold lg:max-w-[30ch] lg:text-[26px]">{status.message}</p>
          </div>

          <div className="grow lg:hidden" />

          <footer
            className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 text-sm font-bold lg:hidden ${
              next ? "border-t-[3px] border-ink pt-4" : ""
            }`}
          >
            <p aria-live="polite">{meta}</p>
            {next && <p>{next}</p>}
          </footer>
        </main>
      </div>
    </div>
  );
}
