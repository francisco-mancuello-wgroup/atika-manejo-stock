import { render, screen, within } from "@testing-library/react";
import type { ResumenData } from "../lib/queries/summary";
import { ResumenView } from "./resumen-view";

const data: ResumenData = {
  totals: {
    stock: 1217,
    unitsSold: 83,
    unitsBought: 1300,
    investmentUsd: 12345.5,
    investmentGs: 91_000_000,
    stockValueGs: 250_500_000,
  },
  monthSalesGs: 1_800_000,
  lots: [
    {
      id: "lot-1",
      name: "Casa Icona",
      supplier: "Casa Icona",
      purchasedAt: "2026-03-10",
      exchangeRate: 7000,
      products: 12,
      unitsBought: 100,
      unitsSold: 25,
      stock: 75,
      investmentUsd: 3000,
      investmentGs: 21_000_000,
      stockValueGs: 40_000_000,
    },
  ],
  latestSales: [
    {
      id: "s1",
      date: "2026-06-23",
      productName: "Vestido Lino",
      size: "M",
      quantity: 2,
      unitPriceGs: 300_000,
      totalGs: 600_000,
      customer: "Ana",
    },
  ],
};

describe("ResumenView", () => {
  it("renders the page heading", () => {
    render(<ResumenView data={data} />);
    expect(screen.getByRole("heading", { level: 1, name: "Resumen" })).toBeInTheDocument();
  });

  it("shows the KPIs with Paraguayan formatting", () => {
    render(<ResumenView data={data} />);
    const kpi = (label: string) =>
      screen
        .getAllByText(label)
        .map((el) => el.closest("[data-kpi]"))
        .find((el): el is HTMLElement => el !== null) as HTMLElement;

    expect(within(kpi("Unidades en stock")).getByText("1.217")).toBeInTheDocument();
    expect(within(kpi("Unidades vendidas")).getByText("83")).toBeInTheDocument();
    expect(within(kpi("Inversión")).getByText("₲ 91.000.000")).toBeInTheDocument();
    expect(within(kpi("Inversión")).getByText("US$ 12.345,50")).toBeInTheDocument();
    expect(within(kpi("Stock valorizado")).getByText("₲ 250.500.000")).toBeInTheDocument();
    expect(within(kpi("Ventas del mes")).getByText("₲ 1.800.000")).toBeInTheDocument();
  });

  it("lists each lot with progress, stock and a link to its detail", () => {
    render(<ResumenView data={data} />);
    const row = screen.getByRole("link", { name: "Casa Icona" }).closest("tr") as HTMLElement;
    expect(screen.getByRole("link", { name: "Casa Icona" })).toHaveAttribute(
      "href",
      "/compras/lot-1",
    );
    expect(within(row).getByText("10/03/2026")).toBeInTheDocument();
    expect(within(row).getByText("25 / 100")).toBeInTheDocument();
    expect(within(row).getByText("75")).toBeInTheDocument();
    expect(within(row).getByText("₲ 40.000.000")).toBeInTheDocument();
    expect(within(row).getByRole("progressbar")).toHaveAttribute("aria-valuenow", "25");
  });

  it("lists the latest sales", () => {
    render(<ResumenView data={data} />);
    const section = screen.getByRole("heading", { name: "Últimas ventas" }).closest("section");
    expect(within(section as HTMLElement).getByText("Vestido Lino")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("₲ 600.000")).toBeInTheDocument();
    expect(within(section as HTMLElement).getByText("23/06/2026")).toBeInTheDocument();
  });

  it("shows an empty state without sales", () => {
    render(<ResumenView data={{ ...data, latestSales: [] }} />);
    expect(screen.getByText("Todavía no hay ventas registradas.")).toBeInTheDocument();
  });
});
