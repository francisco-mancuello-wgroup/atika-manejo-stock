import {
  type LotRow,
  saleAmountGs,
  summarizeLots,
  toInventoryProduct,
  toLotDetail,
  toLotSummary,
  toSaleRow,
} from "./view-models";

function at<T>(items: readonly T[], index: number): T {
  const item = items[index];
  if (item === undefined) throw new Error(`no item at index ${index}`);
  return item;
}

const dec = (value: number) => ({ toNumber: () => value });

function lotRow(overrides: Partial<LotRow> = {}): LotRow {
  return {
    id: "lot-1",
    name: "Casa Icona",
    supplier: { name: "Casa Icona" },
    purchasedAt: new Date("2026-03-10T00:00:00.000Z"),
    exchangeRate: dec(7000),
    saleFactor: dec(2.5),
    vatRate: dec(0.1),
    costRate: dec(0.5),
    pricingMode: "global",
    totalShippingUsd: dec(20),
    products: [
      {
        id: "p1",
        code: "A1",
        name: "Vestido Lino",
        color: "Blanco",
        brand: null,
        originalValueUsd: dec(100),
        priceGs: 1_000_000,
        variants: [
          { id: "v1", size: "M", unitsBought: 3, stock: 1 },
          { id: "v2", size: "S", unitsBought: 2, stock: 0 },
        ],
      },
      {
        id: "p2",
        code: null,
        name: "Pantalón",
        color: null,
        brand: null,
        originalValueUsd: dec(40),
        priceGs: 400_000,
        variants: [{ id: "v3", size: "U", unitsBought: 5, stock: 5 }],
      },
    ],
    ...overrides,
  };
}

describe("toLotSummary", () => {
  it("counts units and values stock at list price", () => {
    const summary = toLotSummary(lotRow());
    expect(summary).toMatchObject({
      id: "lot-1",
      name: "Casa Icona",
      purchasedAt: "2026-03-10",
      products: 2,
      unitsBought: 10,
      stock: 6,
      unitsSold: 4,
      stockValueGs: 1 * 1_000_000 + 5 * 400_000,
    });
  });

  it("adds shipping to units × original value × cost rate and converts at the lot rate", () => {
    const summary = toLotSummary(lotRow());
    // 5 × 100 × 0.5 + 5 × 40 × 0.5 + 20 shipping = 370
    expect(summary.investmentUsd).toBeCloseTo(370);
    expect(summary.investmentGs).toBeCloseTo(370 * 7000);
  });

  it("handles a lot without products", () => {
    const summary = toLotSummary(lotRow({ products: [] }));
    expect(summary).toMatchObject({ products: 0, unitsBought: 0, stock: 0, stockValueGs: 0 });
    expect(summary.investmentUsd).toBeCloseTo(20);
  });
});

describe("summarizeLots", () => {
  it("adds up every lot, converting each investment at its own rate", () => {
    const a = toLotSummary(lotRow());
    const b = toLotSummary(lotRow({ id: "lot-2", exchangeRate: dec(7500), products: [] }));
    const total = summarizeLots([a, b]);
    expect(total.stock).toBe(6);
    expect(total.unitsSold).toBe(4);
    expect(total.investmentUsd).toBeCloseTo(390);
    expect(total.investmentGs).toBeCloseTo(370 * 7000 + 20 * 7500);
    expect(total.stockValueGs).toBe(3_000_000);
  });
});

describe("toInventoryProduct", () => {
  it("sorts sizes and flags sold-out ones", () => {
    const lot = lotRow();
    const product = toInventoryProduct(at(lot.products, 0), { id: lot.id, name: lot.name });
    expect(product.sizes).toEqual([
      { size: "S", stock: 0 },
      { size: "M", stock: 1 },
    ]);
    expect(product).toMatchObject({ lotName: "Casa Icona", code: "A1", priceGs: 1_000_000 });
    expect(product.totalStock).toBe(1);
  });
});

describe("toInventoryProduct cover image", () => {
  it("exposes the lowest-position image as imageUrl, null without images", () => {
    const lot = lotRow();
    const base = at(lot.products, 0);
    const images = [
      { url: "/media/products/b.webp", position: 1 },
      { url: "/media/products/a.webp", position: 0 },
    ];
    expect(toInventoryProduct({ ...base, images }, lot).imageUrl).toBe("/media/products/a.webp");
    expect(toInventoryProduct({ ...base, images: [] }, lot).imageUrl).toBeNull();
    expect(toInventoryProduct(base, lot).imageUrl).toBeNull();
  });
});

describe("toLotDetail", () => {
  it("builds the model × size grid with only the sizes present in the lot", () => {
    const detail = toLotDetail(lotRow());
    expect(detail.sizes).toEqual(["S", "M", "U"]);
    const dress = at(detail.rows, 0);
    expect(dress.cells).toEqual({ S: { stock: 0, bought: 2 }, M: { stock: 1, bought: 3 } });
    expect(at(detail.rows, 1).cells).toEqual({ U: { stock: 5, bought: 5 } });
  });

  it("derives unit cost from original value, cost rate and shipping per bought unit", () => {
    const detail = toLotDetail(lotRow());
    // shipping per unit = 20 / 10 = 2
    expect(at(detail.rows, 0).unitCostUsd).toBeCloseTo(100 * 0.5 + 2);
    expect(at(detail.rows, 0).originalValueUsd).toBe(100);
    expect(at(detail.rows, 0).priceGs).toBe(1_000_000);
  });

  it("exposes the parameters in UI units (percentages)", () => {
    const { params } = toLotDetail(lotRow());
    expect(params).toEqual({
      exchangeRate: 7000,
      saleFactor: 2.5,
      vatPercent: 10,
      costPercent: 50,
      totalShippingUsd: 20,
    });
  });

  it("exposes whether the lot follows the global parameters or has its own", () => {
    expect(toLotDetail(lotRow()).pricingMode).toBe("global");
    expect(toLotDetail(lotRow({ pricingMode: "custom" })).pricingMode).toBe("custom");
  });

  it("does not divide by zero when the lot has no units", () => {
    const detail = toLotDetail(lotRow({ products: [] }));
    expect(detail.rows).toEqual([]);
    expect(detail.sizes).toEqual([]);
  });
});

describe("saleAmountGs / toSaleRow", () => {
  const sale = {
    id: "s1",
    soldAt: new Date("2026-06-23T00:00:00.000Z"),
    quantity: 2,
    listPriceGs: 300_000,
    chargedGs: null,
    customer: "Ana",
    notes: null,
    variant: { size: "M", product: { id: "p1", name: "Vestido Lino" } },
  };

  it("uses the charged price when present, else the list price, times quantity", () => {
    expect(saleAmountGs(sale)).toBe(600_000);
    expect(saleAmountGs({ ...sale, chargedGs: 250_000 })).toBe(500_000);
  });

  it("maps to a flat row", () => {
    expect(toSaleRow(sale)).toEqual({
      id: "s1",
      date: "2026-06-23",
      productName: "Vestido Lino",
      size: "M",
      quantity: 2,
      unitPriceGs: 300_000,
      totalGs: 600_000,
      customer: "Ana",
    });
  });
});
