import { describe, expect, it, vi } from "vitest";
import { createBlobPhotoStorage } from "./blob-photo-storage";
import { isUploadedPhoto } from "./photo-storage";

const HOST = "https://abc123.public.blob.vercel-storage.com";

function fakeClient() {
  return {
    put: vi.fn(async (pathname: string) => `${HOST}/${pathname}`),
    del: vi.fn(async () => {}),
  };
}

describe("blob photo storage", () => {
  it("uploads the photo under products/uploads and returns its public URL", async () => {
    const client = fakeClient();
    const storage = createBlobPhotoStorage(client);
    const bytes = new Uint8Array([9, 8, 7]);
    const url = await storage.saveProductPhoto("prod-1", "x.webp", bytes);
    expect(url).toBe(`${HOST}/products/uploads/prod-1/x.webp`);
    expect(client.put).toHaveBeenCalledWith("products/uploads/prod-1/x.webp", bytes, "image/webp");
    expect(isUploadedPhoto(url)).toBe(true);
  });

  it("deletes its own uploads", async () => {
    const client = fakeClient();
    const storage = createBlobPhotoStorage(client);
    await storage.deleteProductPhoto(`${HOST}/products/uploads/prod-1/x.webp`);
    expect(client.del).toHaveBeenCalledWith(`${HOST}/products/uploads/prod-1/x.webp`);
  });

  it("refuses unsafe names and anything outside the uploads folder", async () => {
    const client = fakeClient();
    const storage = createBlobPhotoStorage(client);
    await expect(storage.saveProductPhoto("../x", "x.webp", new Uint8Array())).rejects.toThrow();
    await expect(storage.deleteProductPhoto(`${HOST}/banks/uploads/b/x.webp`)).rejects.toThrow();
    await expect(
      storage.deleteProductPhoto("https://evil.example.com/products/uploads/p/x.webp"),
    ).rejects.toThrow();
    expect(client.del).not.toHaveBeenCalled();
  });

  it("leaves photos uploaded to local disk alone (nothing of them lives in the blob store)", async () => {
    const client = fakeClient();
    const storage = createBlobPhotoStorage(client);
    await expect(
      storage.deleteProductPhoto("/media/products/uploads/p1/x.webp"),
    ).resolves.toBeUndefined();
    expect(client.del).not.toHaveBeenCalled();
  });
});

describe("isUploadedPhoto", () => {
  it("recognizes local and blob uploads, not seed photos", () => {
    expect(isUploadedPhoto("/media/products/uploads/p1/x.webp")).toBe(true);
    expect(isUploadedPhoto(`${HOST}/products/uploads/p1/x.webp`)).toBe(true);
    expect(isUploadedPhoto("/media/products/casa-icona/x.webp")).toBe(false);
    expect(isUploadedPhoto(`${HOST}/banks/uploads/b/x.webp`)).toBe(false);
  });
});
