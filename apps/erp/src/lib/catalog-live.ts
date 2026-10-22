import { after } from "next/server";

// Must match the topic and event the catalog subscribes to (apps/catalog LiveRefresh).
const TOPIC = "catalog";
const EVENT = "changed";
const TIMEOUT_MS = 2000;

/**
 * Tells open catalog pages that something they show changed (Supabase Realtime Broadcast over
 * REST, no payload and no table exposed). Never throws: a failed signal must not fail a save.
 * No-op without the Supabase env vars.
 */
export async function sendCatalogChanged(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return;
  try {
    const response = await fetch(
      `${url.replace(/\/+$/, "")}/realtime/v1/api/broadcast/${TOPIC}/events/${EVENT}`,
      {
        method: "POST",
        headers: { apikey: key, "Content-Type": "application/json" },
        body: JSON.stringify({}),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      },
    );
    if (!response.ok) console.warn(`catalog broadcast answered ${response.status}`);
  } catch (error) {
    console.warn("catalog broadcast failed", error);
  }
}

/**
 * Call after a successful save that changes what the catalog shows. Runs once the response is
 * sent (`after`), so it never delays the action; outside a request it just fires.
 */
export function notifyCatalogChanged(): void {
  try {
    after(sendCatalogChanged);
  } catch {
    void sendCatalogChanged();
  }
}
