import { formatAge } from "@/lib/domain/format";
import type { DisplayState, Status } from "@/lib/domain/types";
import { KilnIcon } from "./KilnIcon";

const CARD_COLOUR: Record<DisplayState, string> = {
  CLOSED: "bg-closed",
  OPEN_FULL: "bg-full",
  OPEN_EMPTY: "bg-empty",
  OFFLINE: "bg-offline",
};

export interface StatusCardProps {
  status: Status;
  onRefresh: () => void;
  refreshing: boolean;
  /** The last refresh (or the initial load) failed. */
  failed: boolean;
}

function metaText({ status, failed }: Pick<StatusCardProps, "status" | "failed">): string {
  if (failed) return "Couldn't refresh";
  if (status.ageSeconds === null) return "No readings yet";
  return `${status.offline ? "Last reading" : "Checked"} ${formatAge(status.ageSeconds)}`;
}

function RefreshButton({ onRefresh, refreshing }: Pick<StatusCardProps, "onRefresh" | "refreshing">) {
  return (
    <button
      type="button"
      onClick={onRefresh}
      disabled={refreshing}
      aria-busy={refreshing}
      className="min-h-12 cursor-pointer rounded-xl border-[3px] border-ink bg-button px-5 font-display text-lg tracking-[0.06em] shadow-[5px_5px_0_var(--color-ink)] transition-[translate,box-shadow] focus-visible:outline-4 focus-visible:outline-offset-4 focus-visible:outline-ink active:translate-x-[3px] active:translate-y-[3px] active:shadow-[2px_2px_0_var(--color-ink)] disabled:cursor-wait disabled:opacity-70 lg:px-[22px]"
    >
      {refreshing ? "CHECKING…" : "REFRESH"}
    </button>
  );
}

/** The Pastel Riso status card: one layout below `lg`, the wide desktop layout above it. */
export function StatusCard(props: StatusCardProps) {
  const { status } = props;
  const meta = metaText(props);
  // The offline design has no REFRESH button; it comes back if a refresh failed so people can retry.
  const showButton = !status.offline || props.failed;
  const offline = status.state === "OFFLINE";

  return (
    <div className="min-h-svh bg-page px-4 py-6 font-sans text-ink lg:px-6 lg:pt-10 lg:pb-14">
      <div className="mx-auto flex max-w-[420px] flex-col gap-8 lg:max-w-[1160px]">
        <header className="hidden flex-wrap items-center justify-between gap-4 lg:flex">
          <p className="font-display text-[30px] tracking-[0.04em]">PART TIME KILN WATCHER</p>
          <div className="flex items-center gap-4">
            <p className="text-[15px] font-bold" aria-live="polite">{meta}</p>
            {showButton && <RefreshButton {...props} />}
          </div>
        </header>

        <main
          data-state={status.state}
          className={`${CARD_COLOUR[status.state]} flex min-h-[min(780px,calc(100svh-3rem))] flex-col gap-4 rounded-[28px] border-4 border-ink p-[26px] shadow-[10px_10px_0_var(--color-ink)] lg:min-h-0 lg:flex-row lg:flex-wrap lg:items-center lg:gap-12 lg:rounded-[36px] lg:p-12 lg:shadow-[14px_14px_0_var(--color-ink)]`}
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

          <div className="flex items-center justify-between gap-3 lg:hidden">
            <p className="text-sm font-bold" aria-live="polite">{meta}</p>
            {showButton && <RefreshButton {...props} />}
          </div>
        </main>
      </div>
    </div>
  );
}
