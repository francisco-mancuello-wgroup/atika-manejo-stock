"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const VERSION_URL = "/api/catalog-version";
const POLL_MS = 4000;

/**
 * Refreshes the open page when the ERP saves something the catalog shows: polls the version
 * counter (CDN-cached, see the route) while the tab is visible and refreshes when it changes.
 * Renders nothing; fetch errors are ignored and retried on the next tick.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    let seen: number | undefined;

    const check = async () => {
      try {
        const response = await fetch(VERSION_URL, { cache: "no-store" });
        if (!response.ok) return;
        const { version } = (await response.json()) as { version: number };
        if (seen !== undefined && version !== seen) router.refresh();
        seen = version;
      } catch {
        // Offline or a transient error: try again on the next tick.
      }
    };
    const isVisible = () => document.visibilityState === "visible";

    let timer: ReturnType<typeof setInterval> | undefined;
    const start = () => {
      if (timer) return;
      void check();
      timer = setInterval(() => void check(), POLL_MS);
    };
    const stop = () => {
      clearInterval(timer);
      timer = undefined;
    };
    const onVisibilityChange = () => (isVisible() ? start() : stop());

    if (isVisible()) start();
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [router]);

  return null;
}
