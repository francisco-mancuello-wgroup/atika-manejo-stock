import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`NEXT_REDIRECT:${url}`);
  },
}));

import EditBankPromoPage from "./[id]/page";
import NewBankPromoPage from "./nueva/page";

describe("legacy promo routes", () => {
  it("/promos/bancos/nueva opens the new promo in the master-detail screen", () => {
    expect(() => NewBankPromoPage()).toThrow("NEXT_REDIRECT:/promos/bancos?nueva=1");
  });

  it("/promos/bancos/[id] selects that promo in the master-detail screen", async () => {
    await expect(EditBankPromoPage({ params: Promise.resolve({ id: "abc" }) })).rejects.toThrow(
      "NEXT_REDIRECT:/promos/bancos?promo=abc",
    );
  });
});
