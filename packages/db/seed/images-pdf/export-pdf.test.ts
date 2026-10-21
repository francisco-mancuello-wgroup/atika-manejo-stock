import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import sharp from "sharp";
import { afterEach, describe, expect, it } from "vitest";
import { solidPng } from "../images/test-helpers";
import { writePdfExport } from "./export-pdf";
import { parsePdfManifest } from "./pdf-manifest";
import { type PdfPageInput, planPdfLot } from "./plan";

const dirs: string[] = [];
afterEach(async () => {
  await Promise.all(dirs.splice(0).map((d) => rm(d, { recursive: true, force: true })));
});
const tempDir = async () => {
  const dir = await mkdtemp(join(tmpdir(), "atika-pdf-export-"));
  dirs.push(dir);
  return dir;
};

const pages: PdfPageInput[] = [
  {
    layout: {
      page: 3,
      texts: [
        { top: 1, left: 1, size: 60, text: "01" },
        { top: 2, left: 1, size: 41, text: "Costa Coco" },
        { top: 3, left: 1, size: 10, text: "01 / 18" },
      ],
      images: [],
    },
    photos: [{ src: "a.png", top: 0, left: 0, width: 2000, height: 3000, format: "png" }],
    logosSkipped: 1,
  },
  {
    layout: { page: 1, texts: [], images: [] },
    photos: [{ src: "cover.png", top: 0, left: 0, width: 10, height: 10, format: "png" }],
    logosSkipped: 0,
  },
];

const plan = planPdfLot(
  { pdf: "atika.pdf", lotName: "Casa Icona", captions: "numbered-looks" },
  [
    { code: null, name: "COSTA COCO", brand: null },
    { code: null, name: "NINA", brand: null },
  ],
  pages,
);

const read = async (src: string) => solidPng(2000, 3000, src === "a.png" ? "#aa5533" : "#222222");

async function hashFolder(dir: string): Promise<string> {
  const hash = createHash("sha256");
  const walk = async (current: string): Promise<void> => {
    for (const entry of (await readdir(current, { withFileTypes: true })).sort((a, b) =>
      a.name.localeCompare(b.name),
    )) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) await walk(full);
      else hash.update(full.slice(dir.length)).update(await readFile(full));
    }
  };
  await walk(dir);
  return hash.digest("hex");
}

describe("writePdfExport", () => {
  it("writes optimized WebP files (long side capped, never upscaled) and a valid manifest", async () => {
    const dir = await tempDir();
    await writePdfExport(dir, [plan], read);

    const meta = await sharp(join(dir, "casa-icona", "costa-coco.webp")).metadata();
    expect(meta.format).toBe("webp");
    expect(Math.max(meta.width ?? 0, meta.height ?? 0)).toBe(1600);

    const manifest = parsePdfManifest(
      JSON.parse(await readFile(join(dir, "manifest.json"), "utf8")),
    );
    const lot = manifest.lots[0];
    expect(lot?.slug).toBe("casa-icona");
    expect(lot?.pdf).toBe("atika.pdf");
    expect(lot?.images).toHaveLength(1);
    expect(lot?.images[0]).toMatchObject({
      productIndex: 0,
      code: null,
      name: "COSTA COCO",
      file: "casa-icona/costa-coco.webp",
      position: 0,
      page: 3,
      caption: "Costa Coco",
      rule: "exact",
      recreated: false,
      width: 1067,
      height: 1600,
    });
    expect(lot?.productsWithoutImage).toEqual([{ productIndex: 1, name: "NINA" }]);
    expect(lot?.unmatchedImages).toEqual([
      {
        page: 1,
        caption: null,
        reason: "no-caption",
        file: "sin-asignar/atika/p01-sin-texto.webp",
      },
    ]);
    const unassigned = await sharp(
      join(dir, "sin-asignar", "atika", "p01-sin-texto.webp"),
    ).metadata();
    expect(unassigned.format).toBe("webp");
    expect(lot?.stats).toEqual({ imagesFound: 2, logosSkipped: 1, matched: 1, unmatched: 1 });
  });

  it("empties the folder first and gives identical bytes on a second run", async () => {
    const dir = await tempDir();
    await writePdfExport(dir, [plan], read);
    const first = await hashFolder(dir);
    await writeFile(join(dir, "stale.webp"), "old");
    await writePdfExport(dir, [plan], read);
    expect((await readdir(dir)).sort()).toEqual(["casa-icona", "manifest.json", "sin-asignar"]);
    expect(await hashFolder(dir)).toBe(first);
  });
});
