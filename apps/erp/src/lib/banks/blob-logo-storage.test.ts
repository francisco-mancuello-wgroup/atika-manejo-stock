import { describe, expect, it, vi } from "vitest";
import { createBlobLogoStorage } from "./blob-logo-storage";
import { isUploadedLogo } from "./logo-storage";

const HOST = "https://abc123.public.blob.vercel-storage.com";

function fakeClient() {
  return {
    put: vi.fn(async (pathname: string) => `${HOST}/${pathname}`),
    del: vi.fn(async () => {}),
  };
}

describe("blob logo storage", () => {
  it("uploads the logo under banks/uploads and returns its public URL", async () => {
    const client = fakeClient();
    const storage = createBlobLogoStorage(client);
    const bytes = new Uint8Array([9, 8, 7]);
    const url = await storage.saveBankLogo("bank-1", "x.webp", bytes);
    expect(url).toBe(`${HOST}/banks/uploads/bank-1/x.webp`);
    expect(client.put).toHaveBeenCalledWith("banks/uploads/bank-1/x.webp", bytes, "image/webp");
    expect(isUploadedLogo(url)).toBe(true);
  });

  it("deletes its own uploads", async () => {
    const client = fakeClient();
    const storage = createBlobLogoStorage(client);
    await storage.deleteBankLogo(`${HOST}/banks/uploads/bank-1/x.webp`);
    expect(client.del).toHaveBeenCalledWith(`${HOST}/banks/uploads/bank-1/x.webp`);
  });

  it("refuses unsafe names and anything outside the uploads folder", async () => {
    const client = fakeClient();
    const storage = createBlobLogoStorage(client);
    await expect(storage.saveBankLogo("../x", "x.webp", new Uint8Array())).rejects.toThrow();
    await expect(storage.deleteBankLogo(`${HOST}/products/uploads/b/x.webp`)).rejects.toThrow();
    await expect(
      storage.deleteBankLogo("https://evil.example.com/banks/uploads/p/x.webp"),
    ).rejects.toThrow();
    expect(client.del).not.toHaveBeenCalled();
  });

  it("leaves logos uploaded to local disk alone (nothing of them lives in the blob store)", async () => {
    const client = fakeClient();
    const storage = createBlobLogoStorage(client);
    await expect(storage.deleteBankLogo("/media/banks/uploads/p1/x.webp")).resolves.toBeUndefined();
    expect(client.del).not.toHaveBeenCalled();
  });
});

describe("isUploadedLogo", () => {
  it("recognizes local and blob uploads, not seed logos", () => {
    expect(isUploadedLogo("/media/banks/uploads/p1/x.webp")).toBe(true);
    expect(isUploadedLogo(`${HOST}/banks/uploads/p1/x.webp`)).toBe(true);
    expect(isUploadedLogo("/media/banks/seed/itau.webp")).toBe(false);
    expect(isUploadedLogo(`${HOST}/products/uploads/b/x.webp`)).toBe(false);
  });
});
