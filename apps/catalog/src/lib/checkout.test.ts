import { afterEach, describe, expect, it, vi } from "vitest";
import type { CartItem } from "./cart";
import { orderLines, SAVE_TIMEOUT_MS, saveOrder } from "./checkout";

const item = (over: Partial<CartItem> = {}): CartItem => ({
  id: "p1",
  name: "Zamba",
  size: "M",
  color: null,
  priceGs: 100_000,
  link: null,
  quantity: 2,
  ...over,
});

afterEach(() => vi.useRealTimers());

describe("orderLines", () => {
  it("sends only the piece, size and quantity (never a price or a name)", () => {
    expect(orderLines([item()])).toEqual([{ productId: "p1", size: "M", quantity: 2 }]);
  });
});

describe("saveOrder", () => {
  it("returns the order number the server gave", async () => {
    const place = vi.fn().mockResolvedValue({ number: 42 });
    expect(await saveOrder([item()], place)).toBe(42);
    expect(place).toHaveBeenCalledWith([{ productId: "p1", size: "M", quantity: 2 }]);
  });

  it("returns null when the server rejects the order", async () => {
    expect(await saveOrder([item()], vi.fn().mockResolvedValue(null))).toBeNull();
  });

  it("returns null when the call throws (offline)", async () => {
    expect(await saveOrder([item()], vi.fn().mockRejectedValue(new Error("offline")))).toBeNull();
  });

  it("gives up after the timeout so WhatsApp still opens", async () => {
    vi.useFakeTimers();
    const pending = saveOrder([item()], () => new Promise(() => {}));
    await vi.advanceTimersByTimeAsync(SAVE_TIMEOUT_MS);
    expect(await pending).toBeNull();
  });
});
