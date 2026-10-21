import { fileURLToPath } from "node:url";

/** Versioned export of the workbook photos, read by the seed. */
export const PRODUCT_IMAGES_DIR = fileURLToPath(
  new URL("../../../../data/product-images", import.meta.url),
);

/** Where the seed copies the files for each app to serve (gitignored). */
export const APP_MEDIA_DIRS = ["catalog", "erp"].map((app) =>
  fileURLToPath(new URL(`../../../../apps/${app}/public/media/products`, import.meta.url)),
);

/** Public URL prefix of the copied files. */
export const MEDIA_URL_PREFIX = "/media/products";

/** Folder under the media root for the brand PDF photos, so they never collide with workbook files. */
export const BRAND_PDF_MEDIA_SUBDIR = "brand-pdf";
