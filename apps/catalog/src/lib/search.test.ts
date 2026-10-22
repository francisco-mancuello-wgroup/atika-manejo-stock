import { describe, expect, it } from "vitest";
import { type SearchEntry, searchEntries } from "./search";

const entry = (overrides: Partial<SearchEntry>): SearchEntry => ({
  anchor: "milonga-pagina-1",
  title: "Vestido L",
  catalog: "Milonga",
  section: "Vestidos",
  colors: ["Negro"],
  photo: "/media/products/p1.webp",
  text: "",
  ...overrides,
});

const entries = [
  entry({ anchor: "milonga-pagina-1", title: "Vestido L", colors: ["Negro"] }),
  entry({
    anchor: "milonga-pagina-16",
    title: "Falda + T Bsc M",
    section: "Salidas de playa",
    colors: ["Marfil", "Negro"],
  }),
  entry({ anchor: "sordo-pagina-2", title: "Earcuff Luna", catalog: "Sordo", section: "Aros" }),
].map((e) => ({ ...e, text: [e.title, e.catalog, e.section, ...e.colors].join(" ") }));

describe("searchEntries", () => {
  it("finds pieces by name, ignoring case and accents", () => {
    expect(searchEntries(entries, "FÁLDA").map((e) => e.anchor)).toEqual(["milonga-pagina-16"]);
  });

  it("matches every word against name, color, catalog and section", () => {
    expect(searchEntries(entries, "negro vestido").map((e) => e.anchor)).toEqual([
      "milonga-pagina-1",
    ]);
    expect(searchEntries(entries, "marfil").map((e) => e.anchor)).toEqual(["milonga-pagina-16"]);
    expect(searchEntries(entries, "sordo").map((e) => e.anchor)).toEqual(["sordo-pagina-2"]);
  });

  it("returns nothing for an empty query", () => {
    expect(searchEntries(entries, "  ")).toEqual([]);
  });
});
