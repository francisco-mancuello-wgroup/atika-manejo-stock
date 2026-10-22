import { beforeEach, describe, expect, it, vi } from "vitest";
import { placeOrderAction } from "./actions";

type Result = { ok: true; id: string; number: number } | { ok: false; reason: string };
const calls: unknown[][] = [];
let outcome: () => Promise<Result> = async () => ({ ok: false, reason: "unavailable" });

vi.mock("../lib/db", () => ({ getDb: () => ({ marker: "db" }) }));
vi.mock("../lib/orders", () => ({
  createOrder: (...args: unknown[]) => {
    calls.push(args);
    return outcome();
  },
}));

describe("placeOrderAction", () => {
  beforeEach(() => {
    calls.length = 0;
  });

  it("returns the order number of a saved order", async () => {
    outcome = async () => ({ ok: true, id: "o1", number: 42 });
    const lines = [{ productId: "p1", size: "M", quantity: 1 }];
    expect(await placeOrderAction(lines)).toEqual({ number: 42 });
    expect(calls).toEqual([[{ marker: "db" }, lines]]);
  });

  it("returns null when the order is rejected", async () => {
    outcome = async () => ({ ok: false, reason: "unavailable" });
    expect(await placeOrderAction([])).toBeNull();
  });

  it("returns null instead of throwing when the database fails", async () => {
    const logged = vi.spyOn(console, "error").mockImplementation(() => {});
    outcome = async () => {
      throw new Error("db down");
    };
    expect(await placeOrderAction([])).toBeNull();
    expect(logged).toHaveBeenCalledWith("placeOrderAction failed", expect.any(Error));
  });
});
