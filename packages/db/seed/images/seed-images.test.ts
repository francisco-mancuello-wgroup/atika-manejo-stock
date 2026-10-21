import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import type { ParsedLot, ParsedProduct } from "../excel/parse";
import type { Manifest, ManifestImage } from "./manifest";
import {
  copyProductImages,
  EMPTY_IMAGE_PLAN,
  planProductImages,
  readManifest,
} from "./seed-images";

const product = (name: string, code: string | null = null): ParsedProduct => ({
  code,
  name,
  brand: null,
  color: null,
  originalValueUsd: 1,
  variants: [],
  sourceRows: [],
});

const lot = (lotName: string, products: ParsedProduct[]): ParsedLot =>
  ({ lotName, products }) as ParsedLot;

const image = (over: Partial<ManifestImage>): ManifestImage => ({
  productIndex: 0,
  code: null,
  name: "Top",
  file: "atika/top.webp",
  position: 0,
  sourceRow: 2,
  sourceFormat: "png",
  width: 1,
  height: 1,
  bytes: 1,
  sourceBytes: 1,
  ...over,
});

const manifest = (images: ManifestImage[], lotName = "Átika"): Manifest => ({
  version: 1,
  lots: [{ lot: lotName, slug: "atika", images, unmatchedImages: [], productsWithoutImage: [] }],
});

describe("planProductImages", () => {
  const lots = [lot("Átika", [product("Top"), product("Falda", "F-1")])];

  it("gives each product its images with the cover first and the product name as alt", () => {
    const plan = planProductImages(
      manifest([
        image({ productIndex: 1, name: "Falda", code: "F-1", file: "atika/f-1-falda.webp" }),
        image({ file: "atika/top-2.webp", position: 1 }),
        image({}),
      ]),
      lots,
    );
    expect(plan.get("Átika", 0)).toEqual([
      { url: "/media/products/atika/top.webp", alt: "Top", position: 0 },
      { url: "/media/products/atika/top-2.webp", alt: "Top", position: 1 },
    ]);
    expect(plan.get("Átika", 1)).toEqual([
      { url: "/media/products/atika/f-1-falda.webp", alt: "Falda", position: 0 },
    ]);
  });

  it("has no images for products or lots the manifest does not mention", () => {
    const plan = planProductImages(manifest([image({})]), lots);
    expect(plan.get("Átika", 1)).toEqual([]);
    expect(plan.get("Other", 0)).toEqual([]);
    expect(EMPTY_IMAGE_PLAN.get("Átika", 0)).toEqual([]);
  });

  it("refuses a stale manifest instead of attaching photos to the wrong product", () => {
    expect(() => planProductImages(manifest([image({ name: "Other" })]), lots)).toThrow(/export/i);
    expect(() => planProductImages(manifest([image({ productIndex: 5 })]), lots)).toThrow(
      /export/i,
    );
    expect(() => planProductImages(manifest([image({})], "Gone"), lots)).toThrow(/export/i);
    expect(() => planProductImages(manifest([image({ code: "X" })]), lots)).toThrow(/export/i);
  });
});

describe("files", () => {
  const dirs: string[] = [];
  afterEach(async () => {
    await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
  });
  const tempDir = async () => {
    const dir = await mkdtemp(join(tmpdir(), "atika-seed-images-"));
    dirs.push(dir);
    return dir;
  };

  it("readManifest returns null when there is no manifest", async () => {
    expect(await readManifest(await tempDir())).toBeNull();
  });

  it("readManifest parses the manifest on disk", async () => {
    const dir = await tempDir();
    await writeFile(join(dir, "manifest.json"), JSON.stringify(manifest([image({})])));
    expect((await readManifest(dir))?.lots[0]?.images).toHaveLength(1);
  });

  it("copyProductImages replaces the target contents and is idempotent", async () => {
    const source = await tempDir();
    const target = join(await tempDir(), "media", "products");
    await mkdir(join(source, "atika"), { recursive: true });
    await writeFile(join(source, "atika", "top.webp"), "bytes");
    await mkdir(target, { recursive: true });
    await writeFile(join(target, "stale.webp"), "old");

    const files = [{ from: join(source, "atika", "top.webp"), to: "atika/top.webp" }];
    await copyProductImages([target], files);
    await copyProductImages([target], files);

    expect(await readdir(target)).toEqual(["atika"]);
    expect(await readFile(join(target, "atika", "top.webp"), "utf8")).toBe("bytes");
  });
});
