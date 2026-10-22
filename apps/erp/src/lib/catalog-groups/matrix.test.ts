import { describe, expect, it } from "vitest";
import type { GroupProduct } from "../queries/catalog-groups";
import {
  assignAllFree,
  draftChanges,
  filterRows,
  groupKpis,
  matrixSizes,
  reconcileDraft,
  rowRemaining,
  savedDraft,
} from "./matrix";

const size = (
  variantId: string,
  label: string,
  stock: number,
  free: number,
  allocated: number,
  sold: number,
  max: number,
) => ({
  variantId,
  size: label,
  stock,
  free,
  allocated,
  sold,
  remaining: Math.min(Math.max(0, allocated - sold), stock),
  max,
});

const products: GroupProduct[] = [
  {
    id: "p1",
    name: "COSTA BLANCO",
    lotName: "Pink",
    imageUrl: null,
    sizes: [size("v1", "S", 5, 2, 3, 1, 5), size("v2", "M", 4, 0, 4, 0, 4)],
  },
  {
    id: "p2",
    name: "Remera Ñandú",
    lotName: "Pink",
    imageUrl: null,
    sizes: [size("v3", "XL", 2, 0, 2, 2, 2), size("v4", "XS", 3, 3, 0, 0, 3)],
  },
];

describe("savedDraft", () => {
  it("starts every size at its saved assignment", () => {
    expect(savedDraft(products)).toEqual({ v1: "3", v2: "4", v3: "2", v4: "0" });
  });
});

describe("matrixSizes", () => {
  it("lists the sizes of the group once, from smallest to largest", () => {
    expect(matrixSizes(products)).toEqual(["XS", "S", "M", "XL"]);
  });
});

describe("rowRemaining", () => {
  it("sums what the web would see from the typed quantities", () => {
    const draft = { ...savedDraft(products), v1: "5" };
    expect(rowRemaining(products[0] as GroupProduct, draft)).toBe(4 + 4);
    expect(rowRemaining(products[1] as GroupProduct, savedDraft(products))).toBe(0);
  });

  it("never counts more than the physical stock", () => {
    expect(rowRemaining(products[0] as GroupProduct, { v1: "99", v2: "0" })).toBe(5 - 0);
  });
});

describe("groupKpis", () => {
  it("totals the saved data", () => {
    expect(groupKpis(products, savedDraft(products))).toEqual({
      products: 2,
      sizes: 4,
      allocated: 9,
      sold: 3,
      remaining: 2 + 4,
    });
  });
});

describe("draftChanges", () => {
  it("lists only the sizes that differ from the saved value", () => {
    const saved = savedDraft(products);
    expect(draftChanges(products, saved, saved)).toEqual([]);
    const draft = { ...saved, v1: "2", v4: "3" };
    expect(draftChanges(products, saved, draft)).toEqual([
      { variantId: "v1", label: "COSTA BLANCO S", from: 3, to: 2 },
      { variantId: "v4", label: "Remera Ñandú XS", from: 0, to: 3 },
    ]);
  });

  it("treats blank or invalid text as 0", () => {
    const saved = savedDraft(products);
    expect(draftChanges(products, saved, { ...saved, v1: "" })).toEqual([
      { variantId: "v1", label: "COSTA BLANCO S", from: 3, to: 0 },
    ]);
  });
});

describe("assignAllFree", () => {
  it("sets every size to the most the group can take", () => {
    expect(assignAllFree(products)).toEqual({ v1: "5", v2: "4", v3: "2", v4: "3" });
  });
});

describe("filterRows", () => {
  const draft = savedDraft(products);

  it("searches by name ignoring case and accents", () => {
    expect(filterRows(products, draft, "nandu", "todas").map((p) => p.id)).toEqual(["p2"]);
    expect(filterRows(products, draft, "  costa ", "todas").map((p) => p.id)).toEqual(["p1"]);
  });

  it("keeps the products with some free stock", () => {
    expect(filterRows(products, draft, "", "libre").map((p) => p.id)).toEqual(["p1", "p2"]);
    const none = [{ ...(products[0] as GroupProduct), sizes: [size("v9", "S", 1, 0, 1, 0, 1)] }];
    expect(filterRows(none, { v9: "1" }, "", "libre")).toEqual([]);
  });

  it("keeps the products the web sees none of", () => {
    expect(filterRows(products, draft, "", "agotadas").map((p) => p.id)).toEqual(["p2"]);
  });
});

describe("reconcileDraft", () => {
  it("keeps unsaved typing, takes new saved values and starts new sizes at their saved value", () => {
    const prevSaved = { a: "1", b: "2", c: "3" };
    const prevValues = { a: "9", b: "2", c: "3" };
    const nextSaved = { a: "1", b: "5", d: "4" };
    expect(reconcileDraft(prevSaved, prevValues, nextSaved)).toEqual({ a: "9", b: "5", d: "4" });
  });
});
