import { beforeEach, describe, expect, it, vi } from "vitest";

const { set, revalidatePath, requireSession } = vi.hoisted(() => ({
  set: vi.fn(),
  revalidatePath: vi.fn(),
  requireSession: vi.fn(async () => ({ userId: "u", email: "e" })),
}));
vi.mock("next/headers", () => ({ cookies: async () => ({ set }) }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("../../../lib/auth/session", () => ({ requireSession }));

import { setCurrencyAction } from "./actions";

const form = (currency: string) => {
  const data = new FormData();
  data.set("currency", currency);
  return data;
};

beforeEach(() => {
  set.mockClear();
  revalidatePath.mockClear();
});

describe("setCurrencyAction", () => {
  it("stores the chosen currency in a cookie and refreshes the layout", async () => {
    await setCurrencyAction(form("usd"));
    expect(set).toHaveBeenCalledWith(
      "currency",
      "usd",
      expect.objectContaining({ path: "/", sameSite: "lax" }),
    );
    expect(revalidatePath).toHaveBeenCalledWith("/", "layout");
  });

  it("normalises an unknown value to gs", async () => {
    await setCurrencyAction(form("eur"));
    expect(set).toHaveBeenCalledWith("currency", "gs", expect.anything());
  });
});
