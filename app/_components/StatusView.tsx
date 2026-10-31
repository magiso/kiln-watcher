"use client";

import { useCallback, useEffect, useState } from "react";
import { NO_READING_STATUS } from "@/lib/domain/status";
import type { Status } from "@/lib/domain/types";
import { StatusCard } from "./StatusCard";

export const REFRESH_INTERVAL_MS = 5 * 60 * 1000;

/** Holds the live status: refreshed every few minutes while visible, and on returning to the tab. */
export function StatusView({ initial }: { initial: Status | null }) {
  const [status, setStatus] = useState<Status | null>(initial);
  const [failed, setFailed] = useState(initial === null);

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/status", { cache: "no-store" });
      if (!response.ok) throw new Error(`status ${response.status}`);
      setStatus((await response.json()) as Status);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    const visible = () => document.visibilityState === "visible";
    const timer = setInterval(() => {
      if (visible()) void refresh();
    }, REFRESH_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (visible()) void refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [refresh]);

  return <StatusCard status={status ?? NO_READING_STATUS} failed={failed} />;
}
