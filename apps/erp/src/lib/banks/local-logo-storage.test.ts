// @vitest-environment node
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { createLocalLogoStorage } from "./local-logo-storage";

describe("local logo storage", () => {
  const roots: string[] = [];
  afterAll(() => Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))));

  async function setup() {
    const base = await mkdtemp(join(tmpdir(), "atika-logos-"));
    roots.push(base);
    const dirs = [join(base, "erp"), join(base, "catalog")];
    return { dirs, storage: createLocalLogoStorage(dirs) };
  }

  it("writes the logo to every public folder and returns its URL", async () => {
    const { dirs, storage } = await setup();
    const url = await storage.saveBankLogo("bank-1", "x.webp", new Uint8Array([9, 8, 7]));
    expect(url).toBe("/media/banks/uploads/bank-1/x.webp");
    for (const dir of dirs) {
      expect([...(await readFile(join(dir, url)))]).toEqual([9, 8, 7]);
    }
  });

  it("deletes the logo everywhere and tolerates missing files", async () => {
    const { dirs, storage } = await setup();
    const url = await storage.saveBankLogo("bank-1", "x.webp", new Uint8Array([1]));
    await storage.deleteBankLogo(url);
    for (const dir of dirs) expect(existsSync(join(dir, url))).toBe(false);
    await expect(storage.deleteBankLogo(url)).resolves.toBeUndefined();
  });

  it("refuses to delete anything outside the bank uploads folder", async () => {
    const { storage } = await setup();
    await expect(storage.deleteBankLogo("/media/products/uploads/p/x.webp")).rejects.toThrow();
    await expect(storage.deleteBankLogo("/media/banks/uploads/../x/y.webp")).rejects.toThrow();
  });

  it("refuses unsafe bank ids and file names", async () => {
    const { storage } = await setup();
    await expect(storage.saveBankLogo("../x", "a.webp", new Uint8Array([1]))).rejects.toThrow();
    await expect(storage.saveBankLogo("b", "../a.webp", new Uint8Array([1]))).rejects.toThrow();
  });
});
