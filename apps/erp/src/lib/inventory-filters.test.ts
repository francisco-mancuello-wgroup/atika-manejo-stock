import { parseInventoryFilters } from "./inventory-filters";

describe("parseInventoryFilters", () => {
  it("reads the lot and the trimmed text query", () => {
    expect(parseInventoryFilters({ lot: "abc", q: "  lino " })).toEqual({
      lotId: "abc",
      query: "lino",
    });
  });

  it("treats blank values as no filter", () => {
    expect(parseInventoryFilters({ lot: "", q: "   " })).toEqual({});
    expect(parseInventoryFilters({})).toEqual({});
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(parseInventoryFilters({ q: ["uno", "dos"] })).toEqual({ query: "uno" });
  });
});
