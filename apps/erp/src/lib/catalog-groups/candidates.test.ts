import { describe, expect, it } from "vitest";
import type { GroupCandidate } from "../queries/catalog-groups";
import { freeSizesLabel, isSelectable, proposedUnits, selectableIds } from "./candidates";

const candidate = (id: string, sizes: [string, number][], inGroup = false): GroupCandidate => ({
  id,
  name: id,
  lotName: "Lote",
  imageUrl: null,
  inGroup,
  sizes: sizes.map(([size, free]) => ({ size, free })),
});

const list = [
  candidate("a", [
    ["S", 3],
    ["M", 1],
    ["L", 1],
  ]),
  candidate("b", [["U", 2]]),
  candidate("c", [["S", 0]]),
  candidate("d", [["S", 4]], true),
];

describe("isSelectable / selectableIds", () => {
  it("excludes products already in the group and without free stock", () => {
    expect(list.map(isSelectable)).toEqual([true, true, false, false]);
    expect(selectableIds(list)).toEqual(["a", "b"]);
  });
});

describe("freeSizesLabel", () => {
  it("lists the sizes that have free stock", () => {
    expect(freeSizesLabel(list[0] as GroupCandidate)).toBe("S 3 · M 1 · L 1");
    expect(freeSizesLabel(list[2] as GroupCandidate)).toBe("");
  });
});

describe("proposedUnits", () => {
  const selected = new Set(["a", "b", "d"]);

  it("adds up what each proposal would assign to the selected selectable products", () => {
    expect(proposedUnits(list, selected, "all")).toBe(5 + 2);
    expect(proposedUnits(list, selected, "one")).toBe(3 + 1);
    expect(proposedUnits(list, selected, "zero")).toBe(0);
  });
});
