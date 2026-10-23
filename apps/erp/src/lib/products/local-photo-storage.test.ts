// @vitest-environment node
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createLocalPhotoStorage, createMediaDirPhotoStorage } from "./local-photo-storage";

describe("local photo storage", () => {
  const roots: string[] = [];
  afterAll(() => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

  async function setup() {
    const base = await mkdtemp(join(tmpdir(), "atika-photos-"));
    roots.push(base);
    const dirs = [join(base, "erp"), join(base, "catalog")];
    return { dirs, storage: createLocalPhotoStorage(dirs) };
  }

  it("writes the photo to every public folder and returns its URL", async () => {
    const { dirs, storage } = await setup();
    const url = await storage.saveProductPhoto("prod-1", "x.webp", new Uint8Array([9, 8, 7]));
    expect(url).toBe("/media/products/uploads/prod-1/x.webp");
    for (const dir of dirs) {
      expect([...(await readFile(join(dir, url)))]).toEqual([9, 8, 7]);
    }
  });

  it("deletes the photo everywhere and tolerates missing files", async () => {
    const { dirs, storage } = await setup();
    const url = await storage.saveProductPhoto("prod-1", "x.webp", new Uint8Array([1]));
    await storage.deleteProductPhoto(url);
    for (const dir of dirs) expect(existsSync(join(dir, url))).toBe(false);
    await expect(storage.deleteProductPhoto(url)).resolves.toBeUndefined();
  });

  it("refuses to delete anything outside the uploads folder", async () => {
    const { dirs, storage } = await setup();
    await expect(storage.deleteProductPhoto("/media/products/casa-icona/x.webp")).rejects.toThrow();
    await expect(
      storage.deleteProductPhoto("/media/products/uploads/../casa-icona/x.webp"),
    ).rejects.toThrow();
    expect(dirs).toHaveLength(2);
  });

  it("refuses unsafe product ids and file names", async () => {
    const { storage } = await setup();
    await expect(storage.saveProductPhoto("../x", "a.webp", new Uint8Array([1]))).rejects.toThrow();
    await expect(storage.saveProductPhoto("p", "../a.webp", new Uint8Array([1]))).rejects.toThrow();
  });

  describe("in a media dir (MEDIA_DIR, the folder behind the /media URL prefix)", () => {
    async function setupMediaDir() {
      const mediaDir = await mkdtemp(join(tmpdir(), "atika-media-"));
      roots.push(mediaDir);
      return { mediaDir, storage: createMediaDirPhotoStorage(mediaDir) };
    }

    it("writes only under the media dir, without the /media segment", async () => {
      const { mediaDir, storage } = await setupMediaDir();
      const url = await storage.saveProductPhoto("prod-1", "x.webp", new Uint8Array([4, 5]));
      expect(url).toBe("/media/products/uploads/prod-1/x.webp");
      const file = join(mediaDir, "products/uploads/prod-1/x.webp");
      expect([...(await readFile(file))]).toEqual([4, 5]);
    });

    it("deletes the file and tolerates missing ones", async () => {
      const { mediaDir, storage } = await setupMediaDir();
      const url = await storage.saveProductPhoto("prod-1", "x.webp", new Uint8Array([1]));
      await storage.deleteProductPhoto(url);
      expect(existsSync(join(mediaDir, "products/uploads/prod-1/x.webp"))).toBe(false);
      await expect(storage.deleteProductPhoto(url)).resolves.toBeUndefined();
    });

    it("treats a leftover Vercel Blob URL as a no-op", async () => {
      const { storage } = await setupMediaDir();
      const blob = "https://abc123.public.blob.vercel-storage.com/products/uploads/prod-1/x.webp";
      await expect(storage.deleteProductPhoto(blob)).resolves.toBeUndefined();
    });

    it("still refuses URLs outside the uploads folder", async () => {
      const { storage } = await setupMediaDir();
      await expect(storage.deleteProductPhoto("/media/products/seed/x.webp")).rejects.toThrow();
      await expect(
        storage.deleteProductPhoto("/media/products/uploads/../x/y.webp"),
      ).rejects.toThrow();
      await expect(
        storage.saveProductPhoto("../x", "a.webp", new Uint8Array([1])),
      ).rejects.toThrow();
    });
  });
});
