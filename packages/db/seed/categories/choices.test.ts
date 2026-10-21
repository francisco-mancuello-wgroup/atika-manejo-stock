import { describe, expect, it } from "vitest";
import type { ParsedLot } from "../excel/parse";
import { buildReport, formatReport, planChoices, productKeys } from "./choices";
import type { Look } from "./looks";

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
  exchangeRate: 7000,
  saleFactor: 2.5,
  vatRate: 0.1,
  costRate: 1,
  totalShippingUsd: 0,
  products,
  sales: [],
  warnings: [],
});

const looks: Look[] = [
  { number: 4, name: "Vitta Mini Dress Black", description: "Vestido corto negro" },
  { number: 1, name: "Costa Coco", description: "Blusa clara y short en tono cacao" },
];

const lots = [
  lot("Casa Icona", [product("VITTA NEGRO"), product("COSTA COCO"), product("NINA")]),
  lot("Milonga", [product("Falda A", "F1"), product("Bot Amar A", "B1"), product("Falda A", "F1")]),
];

describe("productKeys", () => {
  it("keys by lot, name, code and the occurrence among identical products", () => {
    const keys = productKeys("Milonga", [
      { name: "Falda A", code: "F1" },
      { name: "Falda A", code: "F1" },
      { name: "Falda A", code: null },
    ]);
    expect(new Set(keys).size).toBe(3);
    expect(keys[0]).not.toBe(keys[1]);
  });
});

describe("planChoices", () => {
  it("infers categories, using the look description for Casa Icona, and hides new products", () => {
    const plan = planChoices(lots, looks, new Map());
    expect(plan.get("Casa Icona", 0)).toMatchObject({ category: "vestidos", isPublished: false });
    expect(plan.get("Casa Icona", 1)).toMatchObject({ category: null });
    expect(plan.get("Casa Icona", 2)).toMatchObject({ category: null });
    expect(plan.get("Milonga", 0)).toMatchObject({ category: "faldas-y-shorts" });
    expect(plan.get("Milonga", 1)).toMatchObject({ category: null });
  });

  it("restores publication, lets a preserved category win and infers when there is none", () => {
    const keys = productKeys("Milonga", lots[1]?.products ?? []);
    const preserved = new Map([
      [keys[0] ?? "", { isPublished: true, category: "tops" }],
      [keys[1] ?? "", { isPublished: true, category: null }],
      [keys[2] ?? "", { isPublished: false, category: null }],
    ]);
    const plan = planChoices(lots, looks, preserved);
    expect(plan.get("Milonga", 0)).toMatchObject({ category: "tops", isPublished: true });
    expect(plan.get("Milonga", 1)).toMatchObject({ category: null, isPublished: true });
    expect(plan.get("Milonga", 2)).toMatchObject({
      category: "faldas-y-shorts",
      isPublished: false,
    });
  });
});

describe("report", () => {
  it("counts per category and lists the uncategorized products with a reason", () => {
    const report = buildReport(lots, planChoices(lots, looks, new Map()));
    expect(report.counts).toEqual({
      vestidos: 1,
      tops: 0,
      "faldas-y-shorts": 2,
      accesorios: 0,
    });
    expect(report.uncategorized.map((u) => u.name)).toEqual(["COSTA COCO", "NINA", "Bot Amar A"]);
    expect(report.uncategorized[0]?.reason).toMatch(/conflict/);
    expect(report.uncategorized[1]?.reason).toMatch(/no look/);
    const text = formatReport(report);
    expect(text).toContain("faldas-y-shorts: 2");
    expect(text).toContain("Casa Icona / NINA");
  });
});
