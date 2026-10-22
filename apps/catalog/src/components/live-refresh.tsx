"use client";

import { createClient } from "@supabase/supabase-js";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

// Must match the topic and event the ERP broadcasts (apps/erp/src/lib/catalog-live.ts).
const TOPIC = "catalog";
const EVENT = "changed";
// The channel is public, so anyone holding the key could spam it: refresh at most this often.
const MIN_GAP_MS = 1500;

/**
 * Refreshes the open page when the ERP saves something the catalog shows (Supabase Realtime
 * Broadcast, no data travels). Leading + trailing throttle, so a burst of saves costs two
 * refreshes at most. Renders nothing; inert without the Supabase env vars.
 */
export function LiveRefresh() {
  const router = useRouter();

  useEffect(() => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return;

    const supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    let lastRefresh = 0;
    let pending: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      pending = undefined;
      lastRefresh = Date.now();
      router.refresh();
    };
    const channel = supabase
      .channel(TOPIC)
      .on("broadcast", { event: EVENT }, () => {
        if (pending) return;
        const wait = lastRefresh + MIN_GAP_MS - Date.now();
        if (wait <= 0) refresh();
        else pending = setTimeout(refresh, wait);
      })
      .subscribe();

    return () => {
      clearTimeout(pending);
      supabase.removeChannel(channel);
    };
  }, [router]);

  return null;
}
