import { fileURLToPath } from "node:url";

/** Versioned export of the brand PDF photos, read by the seed. */
export const PRODUCT_IMAGES_NEW_DIR = fileURLToPath(
  new URL("../../../../data/product-images-new", import.meta.url),
);
