import { describe, expect, it } from "vitest";
import type { ParsedLot } from "../excel/parse";
import { planChoices, productKeys } from "./choices";
import {
  formatLookbookReport,
  type LookbookPlacement,
  lookbookImages,
  parseLookbook,
  planLookbook,
} from "./lookbook";

const product = (name: string, code: string | null = null): ParsedLot["products"][number] => ({
  code,
  name,
  brand: null,
  color: null,
  originalValueUsd: 1,
  variants: [{ size: "M", unitsBought: 1, sold: 0 }],
  sourceRows: [2],
});

const lot = (lotName: string, products: ParsedLot["products"]): ParsedLot => ({
  supplier: lotName,
  lotName,
  purchasedAt: "2026-01-01",
  exchangeRate: 7400,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 1,
  totalShippingUsd: 0,
  products,
  sales: [],
  warnings: [],
});

const lots = [
  lot("Casa Icona", [product("COSTA COCO"), product("NINA")]),
  lot("Milonga", [product("Vestido L A", "MAMC03"), product("Falda A", "CANC03")]),
  lot("Átika", [product("Aros Sordo Oriente Bañado en Oro 24KT"), product("Otro")]),
];

const placement = (over: Partial<LookbookPlacement>): LookbookPlacement => ({
  lot: "Casa Icona",
  code: null,
  name: "COSTA COCO",
  catalog: "casa_icona",
  order: 1,
  section: "Colección seleccionada",
  catalogName: "Costa Coco",
  cover: null,
  ...over,
});

const placements: LookbookPlacement[] = [
  placement({}),
  placement({ name: "NINA", order: 15, catalogName: "Nina", cover: "sin-asignar/atika/p17.webp" }),
  placement({
    lot: "Milonga",
    code: "MAMC03",
    name: "Vestido L",
    catalog: "milonga",
    order: 4,
    section: "Vestidos",
    catalogName: "Vestido L",
    cover: "sin-asignar/milonga/p04.webp",
  }),
  placement({
    lot: "Átika",
    name: "aros sordo oriente banado en oro 24kt",
    catalog: "sordo",
    order: 2,
    section: "Aros",
    catalogName: "Oriente",
  }),
  placement({ lot: "Milonga", code: "NOPE01", name: "Nada", catalog: "milonga" }),
];

describe("parseLookbook", () => {
  it("reads the committed placements and rejects an unknown catalog", () => {
    const data = parseLookbook({ version: 1, placements });
    expect(data.placements).toHaveLength(5);
    expect(() =>
      parseLookbook({ version: 1, placements: [{ ...placements[0], catalog: "zunilda" }] }),
    ).toThrow(/catalog/);
  });
});

describe("planLookbook", () => {
  const plan = planLookbook(lots, { version: 1, placements });

  it("matches by lot + code first, then by exact or normalized name", () => {
    expect(plan.get("Milonga", 0)?.lookbook).toEqual({
      catalog: "milonga",
      catalogOrder: 4,
      catalogSection: "Vestidos",
      catalogName: "Vestido L",
      inPink: false,
    });
    expect(plan.get("Casa Icona", 0)?.lookbook.catalogName).toBe("Costa Coco");
    expect(plan.get("Átika", 0)?.lookbook).toMatchObject({ catalog: "sordo" });
    expect(plan.get("Milonga", 1)).toBeNull();
    expect(plan.get("Átika", 1)).toBeNull();
  });

  it("reports every placement without a product and counts per catalog", () => {
    expect(plan.unmatched.map((u) => u.placement.code)).toEqual(["NOPE01"]);
    expect(plan.counts).toEqual({ casa_icona: 2, milonga: 1, sordo: 1 });
    const text = formatLookbookReport(plan);
    expect(text).toContain("casa_icona: 2");
    expect(text).toContain("Milonga / Nada [NOPE01]");
  });

  it("refuses a placement that names two products", () => {
    const twice = [lot("Milonga", [product("Falda A", "F1"), product("Falda A", "F1")])];
    const ambiguous = planLookbook(twice, {
      version: 1,
      placements: [placement({ lot: "Milonga", code: "F1", name: "Falda A" })],
    });
    expect(ambiguous.get("Milonga", 0)).toBeNull();
    expect(ambiguous.unmatched[0]?.reason).toMatch(/2 products/);
  });

  it("gives the PDF page photo as the only image of a product with a cover", () => {
    const images = lookbookImages(plan, "brand-pdf");
    expect(images.get("Milonga", 0)).toEqual([
      {
        url: "/media/products/brand-pdf/sin-asignar/milonga/p04.webp",
        alt: "Vestido L",
        position: 0,
      },
    ]);
    expect(images.get("Casa Icona", 0)).toEqual([]);
  });
});

describe("planChoices with lookbook placements", () => {
  const plan = planLookbook(lots, { version: 1, placements });

  it("applies the data placement and publishes a product without a preserved placement", () => {
    const choices = planChoices(lots, [], new Map(), plan);
    expect(choices.get("Milonga", 0)).toMatchObject({
      isPublished: true,
      lookbook: { catalog: "milonga", catalogOrder: 4, inPink: false },
    });
    expect(choices.get("Milonga", 1)).toMatchObject({
      isPublished: false,
      lookbook: { catalog: null },
    });
  });

  it("lets a preserved placement and publication win", () => {
    const keys = productKeys("Átika", lots[2]?.products ?? []);
    const casa = productKeys("Casa Icona", lots[0]?.products ?? []);
    const preserved = new Map([
      [
        keys[0] ?? "",
        {
          isPublished: false,
          category: null,
          lookbook: {
            catalog: "sordo" as const,
            catalogOrder: 9,
            catalogSection: "Otros",
            catalogName: "Mío",
            inPink: true,
          },
        },
      ],
      [
        casa[0] ?? "",
        {
          isPublished: false,
          category: null,
          lookbook: {
            catalog: null,
            catalogOrder: null,
            catalogSection: null,
            catalogName: null,
            inPink: true,
          },
        },
      ],
    ]);
    const choices = planChoices(lots, [], preserved, plan);
    expect(choices.get("Átika", 0)).toMatchObject({
      isPublished: false,
      lookbook: { catalogOrder: 9, catalogName: "Mío", inPink: true },
    });
    expect(choices.get("Casa Icona", 0)).toMatchObject({
      isPublished: true,
      lookbook: { catalog: "casa_icona", catalogOrder: 1, inPink: true },
    });
  });
});
