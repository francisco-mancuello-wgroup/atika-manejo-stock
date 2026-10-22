import { fileURLToPath } from "node:url";

/** Versioned logos (webp + manifest.json), read by the seed. */
export const BANK_LOGOS_DIR = fileURLToPath(
  new URL("../../../../data/bank-logos", import.meta.url),
);

/** Where the seed copies the logos for each app to serve (gitignored). */
export const BANK_APP_MEDIA_DIRS = ["catalog", "erp"].map((app) =>
  fileURLToPath(new URL(`../../../../apps/${app}/public/media/banks/seed`, import.meta.url)),
);
