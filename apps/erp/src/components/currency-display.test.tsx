import { render, screen, within } from "@testing-library/react";
import type { FormState } from "../lib/action-state";
import type { CurrencyDisplay } from "../lib/currency";
import type { CatalogProduct } from "../lib/queries/catalog";
import type { ResumenData } from "../lib/queries/summary";
import type { InventoryProduct, LotDetail, LotSummary, SaleRow } from "../lib/view-models";
import { CatalogoWebView } from "./catalogo-web-view";
import { InventarioView } from "./inventario-view";
import { LotDetailView } from "./lot-detail-view";
import { LotGrid } from "./lot-grid";
import { ResumenView } from "./resumen-view";
import { VentasView } from "./ventas-view";

// 10.000 Gs per US$ keeps the arithmetic obvious.
const usd: CurrencyDisplay = { currency: "usd", exchangeRate: 10_000 };

const sale: SaleRow = {
  id: "s1",
  date: "2026-06-23",
  productName: "Vestido Lino",
  size: "M",
  quantity: 2,
  unitPriceGs: 300_000,
  totalGs: 600_000,
  customer: null,
};

const summary: LotSummary = {
  id: "lot-1",
  name: "Lote Uno",
  supplier: "Proveedor",
  purchasedAt: "2026-05-01",
  exchangeRate: 7000,
  products: 1,
  stock: 1,
  unitsBought: 2,
  unitsSold: 1,
  investmentGs: 21_000_000,
  investmentUsd: 3000,
  stockValueGs: 40_000_000,
};

describe("views in US$", () => {
  it("Ventas converts unit price and total", () => {
    render(
      <VentasView sales={[sale]} display={usd}>
        <div />
      </VentasView>,
    );
    expect(screen.getByText("US$ 30,00")).toBeInTheDocument();
    expect(screen.getByText("US$ 60,00")).toBeInTheDocument();
    expect(screen.queryByText(/₲/)).not.toBeInTheDocument();
  });

  it("Inventario converts the price", () => {
    const product: InventoryProduct = {
      id: "p1",
      name: "Vestido",
      code: null,
      color: null,
      lotId: "lot-1",
      lotName: "Lote Uno",
      priceGs: 1_000_000,
      sizes: [{ size: "M", stock: 1 }],
      totalStock: 1,
      imageUrl: null,
    };
    render(
      <InventarioView
        products={[product]}
        lots={[{ id: "lot-1", name: "Lote Uno" }]}
        filters={{}}
        display={usd}
      />,
    );
    expect(screen.getByText("US$ 100,00")).toBeInTheDocument();
  });

  it("Catálogo web converts the price", () => {
    const product: CatalogProduct = {
      id: "p1",
      name: "Vestido Lino",
      lotName: "Casa Icona",
      priceGs: 450_000,
      category: null,
      isPublished: true,
      sizes: ["S"],
      imageUrl: null,
      catalog: null,
      catalogOrder: null,
      catalogSection: null,
      catalogName: null,
      inPink: false,
    };
    const idle = async (): Promise<FormState> => ({ status: "idle" });
    render(
      <CatalogoWebView
        products={[product]}
        settings={{
          whatsappNumber: "",
          messageTemplate: "",
          heroText: "",
          showPrices: true,
          showSoldOutSizes: false,
          hideOutOfStock: true,
        }}
        filters={{ status: "todos" }}
        display={usd}
        actions={{
          setVisibility: idle,
          setCategory: idle,
          setVisibilityMany: idle,
          publishAll: idle,
          saveSettings: idle,
          saveLookbook: idle,
        }}
      />,
    );
    expect(screen.getByText("US$ 45,00")).toBeInTheDocument();
  });

  it("Resumen converts guaraní KPIs and swaps the investment pair", () => {
    const data: ResumenData = {
      totals: {
        stock: 1,
        unitsSold: 1,
        unitsBought: 2,
        investmentUsd: 3000,
        investmentGs: 21_000_000,
        stockValueGs: 40_000_000,
      },
      monthSalesGs: 1_800_000,
      lots: [summary],
      latestSales: [sale],
    };
    render(<ResumenView data={data} display={usd} />);
    const kpi = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest("[data-kpi]"))
        .find((el): el is HTMLElement => el !== null) as HTMLElement;
    const investment = within(kpi("Inversión"));
    expect(investment.getByText("US$ 3.000,00")).toBeInTheDocument();
    expect(investment.getByText("₲ 21.000.000")).toBeInTheDocument();
    expect(within(kpi("Stock valorizado")).getByText("US$ 4.000,00")).toBeInTheDocument();
    expect(within(kpi("Ventas del mes")).getByText("US$ 180,00")).toBeInTheDocument();
    expect(screen.getByText("US$ 60,00")).toBeInTheDocument();
  });

  it("Lote detail converts the KPIs and the grid price column", () => {
    const lot: LotDetail = {
      id: "lot-1",
      name: "Lote Uno",
      supplier: "Proveedor",
      purchasedAt: "2026-05-01",
      pricingMode: "global",
      params: {
        exchangeRate: 7000,
        saleFactor: 2.5,
        vatPercent: 10,
        costPercent: 55,
        totalShippingUsd: 0,
      },
      sizes: ["M"],
      rows: [
        {
          id: "p1",
          name: "Vestido",
          code: null,
          originalValueUsd: 100,
          unitCostUsd: 52,
          priceGs: 1_230_000,
          cells: { M: { stock: 1, bought: 2 } },
        },
      ],
      summary,
    };
    const idle = async () => ({ status: "idle" as const });
    render(
      <LotDetailView
        lot={lot}
        display={usd}
        settings={{ exchangeRate: 7000, saleFactor: 2.5, vatPercent: 10, costPercent: 55 }}
        action={idle}
        paramsAction={idle}
        modeAction={idle}
      />,
    );
    expect(screen.getByText("US$ 4.000,00")).toBeInTheDocument();
    expect(screen.getByText("US$ 123,00", { selector: "td" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Precio (US$)" })).toBeInTheDocument();
  });

  it("LotGrid keeps native US$ columns and labels the price column by currency", () => {
    const rows = [
      {
        id: "p1",
        name: "Vestido",
        code: null,
        originalValueUsd: 100,
        unitCostUsd: 52,
        priceGs: 1_000_000,
        cells: {},
      },
    ];
    const { rerender } = render(<LotGrid sizes={[]} rows={rows} display={usd} />);
    expect(screen.getByRole("columnheader", { name: "Precio (US$)" })).toBeInTheDocument();
    rerender(<LotGrid sizes={[]} rows={rows} display={{ currency: "gs" }} />);
    expect(screen.getByRole("columnheader", { name: "Precio (₲)" })).toBeInTheDocument();
    expect(screen.getByText("₲ 1.000.000")).toBeInTheDocument();
  });
});
