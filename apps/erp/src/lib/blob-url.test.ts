import { describe, expect, it } from "vitest";
import { blobPathname } from "./blob-url";

describe("blobPathname", () => {
  it("returns the path of a public Vercel Blob URL", () => {
    expect(
      blobPathname("https://abc123.public.blob.vercel-storage.com/products/uploads/p1/x.webp"),
    ).toBe("products/uploads/p1/x.webp");
  });

  it("is null for local paths and other hosts", () => {
    expect(blobPathname("/media/products/uploads/p1/x.webp")).toBeNull();
    expect(blobPathname("https://evil.example.com/products/uploads/p1/x.webp")).toBeNull();
    expect(
      blobPathname("https://abc.public.blob.vercel-storage.com.evil.com/products/uploads/x.webp"),
    ).toBeNull();
  });
});
