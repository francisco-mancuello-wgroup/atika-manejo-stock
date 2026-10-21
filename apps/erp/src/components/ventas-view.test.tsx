import { render, screen, within } from "@testing-library/react";
import type { SaleRow } from "../lib/view-models";
import { VentasView } from "./ventas-view";

const sales: SaleRow[] = [
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
  {
    id: "s2",
    date: "2026-06-20",
    productName: "Pantalón",
    size: "U",
    quantity: 1,
    unitPriceGs: 400_000,
    totalGs: 400_000,
    customer: null,
  },
];

describe("VentasView", () => {
  it("lists the sales in the given order with formatted values", () => {
    render(
      <VentasView sales={sales}>
        <div>form slot</div>
      </VentasView>,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ventas" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("23/06/2026")).toBeInTheDocument();
    expect(first.getByText("Vestido Lino")).toBeInTheDocument();
    expect(first.getByText("M")).toBeInTheDocument();
    expect(first.getByText("₲ 300.000")).toBeInTheDocument();
    expect(first.getByText("₲ 600.000")).toBeInTheDocument();
    expect(first.getByText("Ana")).toBeInTheDocument();
    expect(within(rows[1] as HTMLElement).getByText("–")).toBeInTheDocument();
  });

  it("renders the form slot and an empty state", () => {
    render(
      <VentasView sales={[]}>
        <div>form slot</div>
      </VentasView>,
    );
    expect(screen.getByText("form slot")).toBeInTheDocument();
    expect(screen.getByText("Todavía no hay ventas registradas.")).toBeInTheDocument();
  });
});
