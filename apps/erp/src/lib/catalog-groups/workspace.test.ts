import { describe, expect, it } from "vitest";
import { groupsHref, parseGroupsSelection } from "./workspace";

describe("parseGroupsSelection", () => {
  it("defaults to the Prendas tab", () => {
    expect(parseGroupsSelection({})).toEqual({ tab: "prendas", groupId: null, isNew: false });
    expect(parseGroupsSelection({ tab: "otra" }).tab).toBe("prendas");
  });

  it("reads the groups tab with a selected group or the new-group editor", () => {
    expect(parseGroupsSelection({ tab: "grupos", grupo: "abc" })).toEqual({
      tab: "grupos",
      groupId: "abc",
      isNew: false,
    });
    expect(parseGroupsSelection({ tab: "grupos", grupo: "nuevo" })).toEqual({
      tab: "grupos",
      groupId: null,
      isNew: true,
    });
  });

  it("ignores the group outside the groups tab and takes the first repeated value", () => {
    expect(parseGroupsSelection({ grupo: "abc" }).groupId).toBeNull();
    expect(parseGroupsSelection({ tab: ["grupos", "x"], grupo: ["a", "b"] }).groupId).toBe("a");
  });
});

describe("groupsHref", () => {
  it("builds short URLs", () => {
    expect(groupsHref({})).toBe("/catalogo-web?tab=grupos");
    expect(groupsHref({ groupId: "abc" })).toBe("/catalogo-web?tab=grupos&grupo=abc");
    expect(groupsHref({ isNew: true })).toBe("/catalogo-web?tab=grupos&grupo=nuevo");
  });
});
