// @vitest-environment node
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it, vi } from "vitest";
import {
  createBlobCoverStorage,
  createLocalCoverStorage,
  createMediaDirCoverStorage,
  isUploadedCover,
} from "./cover-storage";

const HOST = "https://abc123.public.blob.vercel-storage.com";

describe("brand cover storage", () => {
  const roots: string[] = [];
  afterAll(() => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

  async function tempDirs() {
    const base = await mkdtemp(join(tmpdir(), "atika-covers-"));
    roots.push(base);
    return [join(base, "erp"), join(base, "catalog")];
  }

  it("writes the cover to every public folder under media/brands/uploads", async () => {
    const dirs = await tempDirs();
    const storage = createLocalCoverStorage(dirs);
    const url = await storage.saveBrandCover("brand-1", "x.webp", new Uint8Array([9, 8]));
    expect(url).toBe("/media/brands/uploads/brand-1/x.webp");
    for (const dir of dirs) expect([...(await readFile(join(dir, url)))]).toEqual([9, 8]);
    await storage.deleteBrandCover(url);
    for (const dir of dirs) expect(existsSync(join(dir, url))).toBe(false);
    await expect(storage.deleteBrandCover(url)).resolves.toBeUndefined();
  });

  it("writes only to MEDIA_DIR when it is set", async () => {
    const [dir = ""] = await tempDirs();
    const storage = createMediaDirCoverStorage(dir);
    const url = await storage.saveBrandCover("brand-1", "x.webp", new Uint8Array([1]));
    expect([...(await readFile(join(dir, "brands/uploads/brand-1/x.webp")))]).toEqual([1]);
    await storage.deleteBrandCover(url);
    expect(existsSync(join(dir, "brands/uploads/brand-1/x.webp"))).toBe(false);
  });

  it("refuses unsafe names and anything outside the brand uploads folder", async () => {
    const storage = createLocalCoverStorage(await tempDirs());
    await expect(storage.saveBrandCover("../x", "a.webp", new Uint8Array([1]))).rejects.toThrow();
    await expect(storage.deleteBrandCover("/media/banks/uploads/b/x.webp")).rejects.toThrow();
    await expect(storage.deleteBrandCover("/media/brands/uploads/../x/y.webp")).rejects.toThrow();
  });

  it("uploads to Vercel Blob under brands/uploads", async () => {
    const client = { put: vi.fn(async (pathname: string) => `${HOST}/${pathname}`), del: vi.fn() };
    const storage = createBlobCoverStorage(client);
    const bytes = new Uint8Array([1]);
    const url = await storage.saveBrandCover("brand-1", "x.webp", bytes);
    expect(url).toBe(`${HOST}/brands/uploads/brand-1/x.webp`);
    expect(client.put).toHaveBeenCalledWith("brands/uploads/brand-1/x.webp", bytes, "image/webp");
    await storage.deleteBrandCover(url);
    expect(client.del).toHaveBeenCalledWith(url);
    await expect(storage.deleteBrandCover(`${HOST}/products/uploads/b/x.webp`)).rejects.toThrow();
  });

  it("tells uploaded covers from any other URL", () => {
    expect(isUploadedCover("/media/brands/uploads/b/x.webp")).toBe(true);
    expect(isUploadedCover(`${HOST}/brands/uploads/b/x.webp`)).toBe(true);
    expect(isUploadedCover("/atika/covers/milonga.jpg")).toBe(false);
  });
});
