import { render, screen, within } from "@testing-library/react";
import type { LotDetail } from "../lib/view-models";
import { LotGrid } from "./lot-grid";

const detail: Pick<LotDetail, "sizes" | "rows"> = {
  sizes: ["S", "M", "U"],
  rows: [
    {
      id: "p1",
      name: "Vestido Lino",
      code: "A1",
      originalValueUsd: 100,
      unitCostUsd: 52,
      priceGs: 1_000_000,
      cells: { S: { stock: 0, bought: 2 }, M: { stock: 3, bought: 3 } },
    },
  ],
};

describe("LotGrid", () => {
  it("renders one column per size present and the money columns", () => {
    render(<LotGrid sizes={detail.sizes} rows={detail.rows} />);
    const headers = screen.getAllByRole("columnheader").map((h) => h.textContent);
    expect(headers).toEqual([
      "Modelo",
      "S",
      "M",
      "U",
      "Valor original (US$)",
      "Costo unit. (US$)",
      "Precio (₲)",
    ]);
  });

  it("shows stock per cell and marks sold-out cells with the warning colors", () => {
    render(<LotGrid sizes={detail.sizes} rows={detail.rows} />);
    const row = screen.getByText("Vestido Lino").closest("tr") as HTMLElement;
    const soldOut = within(row).getByText("0");
    expect(soldOut.closest("td")).toHaveClass("bg-warnbg", "text-warn");
    const inStock = within(row).getByText("3");
    expect(inStock.closest("td")).not.toHaveClass("bg-warnbg");
  });

  it("shows a dash for a size the model does not have", () => {
    render(<LotGrid sizes={detail.sizes} rows={detail.rows} />);
    const row = screen.getByText("Vestido Lino").closest("tr") as HTMLElement;
    expect(within(row).getByText("–")).toBeInTheDocument();
  });

  it("formats original value, unit cost and price", () => {
    render(<LotGrid sizes={detail.sizes} rows={detail.rows} />);
    expect(screen.getByText("US$ 100,00")).toBeInTheDocument();
    expect(screen.getByText("US$ 52,00")).toBeInTheDocument();
    expect(screen.getByText("₲ 1.000.000")).toBeInTheDocument();
  });
});
