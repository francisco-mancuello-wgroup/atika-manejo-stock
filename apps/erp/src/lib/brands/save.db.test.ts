// @vitest-environment node

import { ensureBrand } from "@atika/db/brands";
import sharp from "sharp";
import { afterAll, describe, expect, it } from "vitest";
import {
  createFixtureLot,
  dbOver,
  disconnectTestDb,
  hasDatabase,
  withRollback,
} from "../../test/db";
import type { CoverStorage } from "./cover-storage";
import { listBrands, moveBrand, removeBrandCover, saveBrandCover, setBrandActive } from "./save";

const NOW = new Date("2030-06-15T12:00:00.000Z");
const MISSING = "00000000-0000-7000-8000-000000000000";

function memoryCovers() {
  const files = new Map<string, Uint8Array>();
  const storage: CoverStorage = {
    async saveBrandCover(brandId, fileName, bytes) {
      const url = `/media/brands/uploads/${brandId}/${fileName}`;
      files.set(url, bytes);
      return url;
    },
    async deleteBrandCover(url) {
      files.delete(url);
    },
  };
  return { storage, files };
}

const png = async () =>
  new Uint8Array(
    await sharp({ create: { width: 30, height: 40, channels: 3, background: "#123456" } })
      .png()
      .toBuffer(),
  );

/** Registers brands in order and returns them (the fallback stays last). */
async function brands(tx: Parameters<typeof createFixtureLot>[0], ...names: string[]) {
  const rows = [];
  for (const name of names) rows.push(await ensureBrand(tx, name));
  return rows;
}

describe.skipIf(!hasDatabase)("brands admin (database)", () => {
  afterAll(disconnectTestDb);

  it("lists brands in order with the pieces they hold and the ones on the web", async () => {
    await withRollback(async (tx) => {
      await tx.product.updateMany({ data: { brand: "Nobody" } });
      await brands(tx, "Count A", "Count B");
      const { products } = await createFixtureLot(tx, [
        { name: "Seen", originalValueUsd: 10, variants: [["M", 2, 2]] },
        { name: "No stock", originalValueUsd: 10, variants: [["M", 2, 0]] },
        { name: "Hidden", originalValueUsd: 10, variants: [["M", 2, 2]] },
        { name: "Loose", originalValueUsd: 10, variants: [["M", 2, 2]] },
        { name: "Grouped", originalValueUsd: 10, variants: [["M", 2, 2]] },
      ]);
      const [seen, noStock, hidden, loose, grouped] = products.map((p) => p.id);
      await tx.product.updateMany({
        where: { id: { in: [seen ?? "", noStock ?? "", hidden ?? ""] } },
        data: { brand: "Count A" },
      });
      await tx.product.update({ where: { id: seen ?? "" }, data: { isPublished: true } });
      await tx.product.update({ where: { id: noStock ?? "" }, data: { isPublished: true } });
      await tx.product.update({ where: { id: grouped ?? "" }, data: { brand: "count b" } });
      await tx.publicationGroup.updateMany({ data: { isActive: false } });
      const variant = await tx.productVariant.findFirstOrThrow({ where: { productId: grouped } });
      await tx.publicationGroup.create({
        data: {
          name: "g",
          isActive: true,
          allocations: { create: [{ variantId: variant.id, allocated: 1 }] },
        },
      });
      void loose;

      const rows = await listBrands(tx, NOW);
      const find = (name: string) => rows.find((row) => row.name === name);
      expect(find("Count A")).toMatchObject({ productCount: 3, visibleCount: 1 });
      expect(find("Count B")).toMatchObject({ productCount: 1, visibleCount: 1 });
      // A product with no brand and one with an unregistered brand count as Otras marcas
      const fallback = rows.at(-1);
      expect(fallback).toMatchObject({ name: "Otras marcas", isFallback: true });
      expect(fallback?.productCount).toBeGreaterThanOrEqual(1);
      expect(rows.map((row) => row.position)).toEqual(
        [...rows.map((row) => row.position)].sort((a, b) => a - b),
      );
    });
  });

  it("turns a brand on and off", async () => {
    await withRollback(async (tx) => {
      const [brand] = await brands(tx, "Switch Brand");
      expect(await setBrandActive(dbOver(tx), brand?.id ?? "", false)).toMatchObject({
        status: "success",
      });
      expect((await tx.brand.findUniqueOrThrow({ where: { id: brand?.id } })).isActive).toBe(false);
      await setBrandActive(dbOver(tx), brand?.id ?? "", true);
      expect((await tx.brand.findUniqueOrThrow({ where: { id: brand?.id } })).isActive).toBe(true);
    });
  });

  it("turns Otras marcas off too", async () => {
    await withRollback(async (tx) => {
      const fallback = await tx.brand.findFirstOrThrow({ where: { isFallback: true } });
      await setBrandActive(dbOver(tx), fallback.id, false);
      expect((await tx.brand.findUniqueOrThrow({ where: { id: fallback.id } })).isActive).toBe(
        false,
      );
    });
  });

  it("refuses an unknown brand", async () => {
    await withRollback(async (tx) => {
      expect(await setBrandActive(dbOver(tx), MISSING, true)).toMatchObject({ status: "error" });
      expect(await setBrandActive(dbOver(tx), "nope", true)).toMatchObject({ status: "error" });
      expect(await moveBrand(dbOver(tx), MISSING, "up")).toMatchObject({ status: "error" });
    });
  });

  it("moves a brand up and down, never past the first place or Otras marcas", async () => {
    await withRollback(async (tx) => {
      const [a, b, c] = await brands(tx, "Move A", "Move B", "Move C");
      const order = async () =>
        (await tx.brand.findMany({ orderBy: [{ position: "asc" }, { name: "asc" }] }))
          .map((row) => row.name)
          .filter((name) => name.startsWith("Move") || name === "Otras marcas");
      expect(await order()).toEqual(["Move A", "Move B", "Move C", "Otras marcas"]);
      await moveBrand(dbOver(tx), c?.id ?? "", "up");
      expect(await order()).toEqual(["Move A", "Move C", "Move B", "Otras marcas"]);
      await moveBrand(dbOver(tx), a?.id ?? "", "down");
      expect(await order()).toEqual(["Move C", "Move A", "Move B", "Otras marcas"]);
      // Edges: nothing moves
      await moveBrand(dbOver(tx), b?.id ?? "", "down");
      expect(await order()).toEqual(["Move C", "Move A", "Move B", "Otras marcas"]);
      const all = await tx.brand.findMany({ orderBy: { position: "asc" } });
      await moveBrand(dbOver(tx), all[0]?.id ?? "", "up");
      expect((await tx.brand.findMany({ orderBy: { position: "asc" } })).map((r) => r.id)).toEqual(
        all.map((row) => row.id),
      );
    });
  });

  it("keeps Otras marcas last and refuses to move it", async () => {
    await withRollback(async (tx) => {
      await brands(tx, "Before Fallback");
      const fallback = await tx.brand.findFirstOrThrow({ where: { isFallback: true } });
      expect(await moveBrand(dbOver(tx), fallback.id, "up")).toMatchObject({ status: "error" });
      const last = await tx.brand.findFirstOrThrow({ orderBy: { position: "desc" } });
      expect(last.id).toBe(fallback.id);
      // The brand just before it cannot go below it
      const rows = await tx.brand.findMany({ orderBy: { position: "asc" } });
      const lastRegistered = rows.at(-2);
      await moveBrand(dbOver(tx), lastRegistered?.id ?? "", "down");
      expect((await tx.brand.findFirstOrThrow({ orderBy: { position: "desc" } })).id).toBe(
        fallback.id,
      );
    });
  });

  it("stores an optimized cover, replacing and deleting the previous uploaded one", async () => {
    await withRollback(async (tx) => {
      const [brand] = await brands(tx, "Cover Admin");
      const { storage, files } = memoryCovers();
      const first = await saveBrandCover(
        dbOver(tx),
        brand?.id ?? "",
        { type: "image/png", bytes: await png() },
        storage,
      );
      expect(first).toMatchObject({ status: "success" });
      const stored = await tx.brand.findUniqueOrThrow({ where: { id: brand?.id } });
      expect(stored.coverUrl?.startsWith(`/media/brands/uploads/${brand?.id}/`)).toBe(true);
      expect(stored.coverUrl?.endsWith(".webp")).toBe(true);
      expect(files.size).toBe(1);

      await saveBrandCover(
        dbOver(tx),
        brand?.id ?? "",
        { type: "image/png", bytes: await png() },
        storage,
      );
      expect(files.size).toBe(1);
      expect(files.has(stored.coverUrl ?? "")).toBe(false);
    });
  });

  it("rejects a cover that is not an image, keeping the current one", async () => {
    await withRollback(async (tx) => {
      const [brand] = await brands(tx, "Bad Cover");
      const { storage, files } = memoryCovers();
      const state = await saveBrandCover(
        dbOver(tx),
        brand?.id ?? "",
        { type: "image/png", bytes: new TextEncoder().encode("nope") },
        storage,
      );
      expect(state).toMatchObject({ status: "error" });
      expect(files.size).toBe(0);
      expect((await tx.brand.findUniqueOrThrow({ where: { id: brand?.id } })).coverUrl).toBeNull();
    });
  });

  it("removes the cover and its uploaded file, leaving static covers alone", async () => {
    await withRollback(async (tx) => {
      const [brand] = await brands(tx, "Remove Cover");
      const { storage, files } = memoryCovers();
      await saveBrandCover(
        dbOver(tx),
        brand?.id ?? "",
        { type: "image/png", bytes: await png() },
        storage,
      );
      expect(await removeBrandCover(dbOver(tx), brand?.id ?? "", storage)).toMatchObject({
        status: "success",
      });
      expect(files.size).toBe(0);
      expect((await tx.brand.findUniqueOrThrow({ where: { id: brand?.id } })).coverUrl).toBeNull();
      // A cover that is not an upload is never deleted from storage
      await tx.brand.update({ where: { id: brand?.id }, data: { coverUrl: "/atika/x.jpg" } });
      files.set("/atika/x.jpg", new Uint8Array([1]));
      await removeBrandCover(dbOver(tx), brand?.id ?? "", storage);
      expect(files.has("/atika/x.jpg")).toBe(true);
    });
  });
});
