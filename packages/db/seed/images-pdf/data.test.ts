import { access, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PRODUCT_IMAGES_NEW_DIR } from "./paths";
import { parsePdfManifest } from "./pdf-manifest";

const exists = await access(join(PRODUCT_IMAGES_NEW_DIR, "manifest.json")).then(
  () => true,
  () => false,
);

describe.skipIf(!exists)("committed data/product-images-new", () => {
  it("has a valid manifest whose files all exist and whose keys are unique", async () => {
    const manifest = parsePdfManifest(
      JSON.parse(await readFile(join(PRODUCT_IMAGES_NEW_DIR, "manifest.json"), "utf8")),
    );
    const keys = new Set<string>();
    const files = new Set<string>();
    for (const lot of manifest.lots) {
      expect(lot.stats.matched).toBe(lot.images.length);
      for (const image of lot.images) {
        await access(join(PRODUCT_IMAGES_NEW_DIR, image.file));
        const key = `${lot.lot}|${image.productIndex}|${image.position}`;
        expect(keys.has(key)).toBe(false);
        expect(files.has(image.file)).toBe(false);
        keys.add(key);
        files.add(image.file);
      }
    }
    expect(files.size).toBeGreaterThan(0);
  });

  it("marks every Sordo photo as digitally recreated", async () => {
    const manifest = parsePdfManifest(
      JSON.parse(await readFile(join(PRODUCT_IMAGES_NEW_DIR, "manifest.json"), "utf8")),
    );
    const sordo = manifest.lots.find((lot) => lot.pdf === "Atika-Catalogo-Aros.pdf");
    expect(sordo?.images.length).toBeGreaterThan(0);
    expect(sordo?.images.every((image) => image.recreated)).toBe(true);
    const others = manifest.lots.filter((lot) => lot.pdf !== "Atika-Catalogo-Aros.pdf");
    expect(others.flatMap((lot) => lot.images).some((image) => image.recreated)).toBe(false);
  });
});
