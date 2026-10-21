import { render, screen, within } from "@testing-library/react";
import type { LotSummary } from "../lib/view-models";
import { ComprasView } from "./compras-view";

const lots: LotSummary[] = [
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
];

describe("ComprasView", () => {
  it("lists every lot with a link to its detail", () => {
    render(<ComprasView lots={lots} />);
    expect(screen.getByRole("heading", { level: 1, name: "Compras" })).toBeInTheDocument();
    const link = screen.getByRole("link", { name: "Casa Icona" });
    expect(link).toHaveAttribute("href", "/compras/lot-1");
    const row = link.closest("tr") as HTMLElement;
    expect(within(row).getByText("10/03/2026")).toBeInTheDocument();
    expect(within(row).getByText("₲ 7.000")).toBeInTheDocument();
    expect(within(row).getByText("12")).toBeInTheDocument();
    expect(within(row).getByText("25 / 100")).toBeInTheDocument();
    expect(within(row).getByText("75")).toBeInTheDocument();
  });

  it("explains when there are no lots", () => {
    render(<ComprasView lots={[]} />);
    expect(screen.getByText("Todavía no hay compras cargadas.")).toBeInTheDocument();
  });
});
