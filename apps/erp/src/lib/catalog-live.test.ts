import { beforeEach, describe, expect, it, vi } from "vitest";

const { after, upsert } = vi.hoisted(() => ({ after: vi.fn(), upsert: vi.fn() }));
vi.mock("next/server", () => ({ after }));
vi.mock("./db", () => ({ getDb: () => ({ catalogVersion: { upsert } }) }));

import { notifyCatalogChanged, sendCatalogChanged } from "./catalog-live";

beforeEach(() => {
  upsert.mockReset().mockResolvedValue({ id: 1, version: 1 });
  after.mockReset();
});

describe("sendCatalogChanged", () => {
  it("increments the single-row catalog version, creating it when missing", async () => {
    await sendCatalogChanged();

    expect(upsert).toHaveBeenCalledWith({
      where: { id: 1 },
      create: { id: 1, version: 1 },
      update: { version: { increment: 1 } },
    });
  });

  it("swallows a database failure", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    upsert.mockRejectedValue(new Error("connection refused"));

    await expect(sendCatalogChanged()).resolves.toBeUndefined();
  });
});

describe("notifyCatalogChanged", () => {
  it("defers the bump until the response is sent", () => {
    notifyCatalogChanged();

    expect(upsert).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    after.mock.calls[0]?.[0]();
    expect(upsert).toHaveBeenCalledTimes(1);
  });

  it("still bumps when there is no request scope to defer to", () => {
    after.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });

    expect(() => notifyCatalogChanged()).not.toThrow();
    expect(upsert).toHaveBeenCalledTimes(1);
  });
});
