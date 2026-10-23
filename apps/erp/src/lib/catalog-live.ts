import { after } from "next/server";
import { getDb } from "./db";

/**
 * Tells open catalog pages that something they show changed: bumps the single-row version
 * counter they poll (`catalog_version`). Never throws: a failed signal must not fail a save.
 */
export async function sendCatalogChanged(): Promise<void> {
  try {
    await getDb().catalogVersion.upsert({
      where: { id: 1 },
      create: { id: 1, version: 1 },
      update: { version: { increment: 1 } },
    });
  } catch (error) {
    console.warn("catalog version bump failed", error);
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
