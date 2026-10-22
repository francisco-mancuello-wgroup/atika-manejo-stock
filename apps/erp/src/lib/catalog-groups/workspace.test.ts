import { describe, expect, it } from "vitest";
import {
  GROUPS_LIST_HREF,
  groupHref,
  legacyGroupRedirect,
  NEW_GROUP_HREF,
  parseCatalogTab,
} from "./workspace";

describe("parseCatalogTab", () => {
  it("defaults to the Prendas tab", () => {
    expect(parseCatalogTab({})).toBe("prendas");
    expect(parseCatalogTab({ tab: "otra" })).toBe("prendas");
  });

  it("reads the Grupos tab", () => {
    expect(parseCatalogTab({ tab: "grupos" })).toBe("grupos");
    expect(parseCatalogTab({ tab: ["grupos", "x"] })).toBe("grupos");
  });
});

describe("group hrefs", () => {
  it("points at the list tab and at the group pages", () => {
    expect(GROUPS_LIST_HREF).toBe("/catalogo-web?tab=grupos");
    expect(NEW_GROUP_HREF).toBe("/catalogo-web/grupos/nuevo");
    expect(groupHref("abc")).toBe("/catalogo-web/grupos/abc");
  });
});

describe("legacyGroupRedirect", () => {
  it("maps the old ?tab=grupos&grupo= links to the group pages", () => {
    expect(legacyGroupRedirect({ tab: "grupos", grupo: "abc" })).toBe("/catalogo-web/grupos/abc");
    expect(legacyGroupRedirect({ tab: "grupos", grupo: "nuevo" })).toBe(NEW_GROUP_HREF);
    expect(legacyGroupRedirect({ tab: "grupos", grupo: ["a", "b"] })).toBe(
      "/catalogo-web/grupos/a",
    );
  });

  it("is null without a group or outside the Grupos tab", () => {
    expect(legacyGroupRedirect({ tab: "grupos" })).toBeNull();
    expect(legacyGroupRedirect({ grupo: "abc" })).toBeNull();
  });
});
