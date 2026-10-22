import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { after } = vi.hoisted(() => ({ after: vi.fn() }));
vi.mock("next/server", () => ({ after }));

import { notifyCatalogChanged, sendCatalogChanged } from "./catalog-live";

const fetchMock = vi.fn();

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "sb_publishable_test");
  fetchMock.mockReset().mockResolvedValue(new Response(null, { status: 202 }));
  vi.stubGlobal("fetch", fetchMock);
  after.mockReset();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("sendCatalogChanged", () => {
  it("posts the broadcast to the public catalog channel with the publishable key", async () => {
    await sendCatalogChanged();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      "https://project.supabase.co/realtime/v1/api/broadcast/catalog/events/changed",
    );
    expect(init.method).toBe("POST");
    expect(init.headers).toMatchObject({
      apikey: "sb_publishable_test",
      "Content-Type": "application/json",
    });
    expect(init.signal).toBeInstanceOf(AbortSignal);
  });

  it("tolerates a trailing slash in the project URL", async () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co/");

    await sendCatalogChanged();

    expect(fetchMock.mock.calls[0]?.[0]).toBe(
      "https://project.supabase.co/realtime/v1/api/broadcast/catalog/events/changed",
    );
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"])(
    "does nothing without %s",
    async (name) => {
      vi.stubEnv(name, "");

      await sendCatalogChanged();

      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("swallows a network failure or timeout", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockRejectedValue(new DOMException("timed out", "TimeoutError"));

    await expect(sendCatalogChanged()).resolves.toBeUndefined();
  });

  it("swallows a non-2xx answer", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    fetchMock.mockResolvedValue(new Response("nope", { status: 401 }));

    await expect(sendCatalogChanged()).resolves.toBeUndefined();
  });
});

describe("notifyCatalogChanged", () => {
  it("defers the broadcast until the response is sent", () => {
    notifyCatalogChanged();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(after).toHaveBeenCalledTimes(1);
    after.mock.calls[0]?.[0]();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("still broadcasts when there is no request scope to defer to", () => {
    after.mockImplementation(() => {
      throw new Error("`after` was called outside a request scope");
    });

    expect(() => notifyCatalogChanged()).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
