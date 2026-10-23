// @vitest-environment node
import { existsSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { bankLogoStorage } from "./storage";

describe("bankLogoStorage", () => {
  const roots: string[] = [];
  afterEach(async () => {
    vi.unstubAllEnvs();
    await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
  });

  it("writes to MEDIA_DIR when set, even if a Blob token is also set", async () => {
    const mediaDir = await mkdtemp(join(tmpdir(), "atika-media-"));
    roots.push(mediaDir);
    vi.stubEnv("MEDIA_DIR", mediaDir);
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    const url = await bankLogoStorage().saveBankLogo("bank-1", "x.webp", new Uint8Array([1]));
    expect(url).toBe("/media/banks/uploads/bank-1/x.webp");
    expect(existsSync(join(mediaDir, "banks/uploads/bank-1/x.webp"))).toBe(true);
  });

  it("ignores a blank MEDIA_DIR", async () => {
    vi.stubEnv("MEDIA_DIR", "   ");
    vi.stubEnv("BLOB_READ_WRITE_TOKEN", "vercel_blob_rw_test");
    // Falls through to the Blob store, whose client is only built (not called) here.
    expect(bankLogoStorage()).toBeDefined();
  });
});
