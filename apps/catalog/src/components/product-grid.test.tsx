import { render, screen } from "@testing-library/react";
import type { CatalogProduct } from "../lib/catalog-view";
import { ProductGrid } from "./product-grid";

const make = (id: string): CatalogProduct => ({
  id,
  name: `Prenda ${id}`,
  category: null,
  priceGs: 1000,
  sizes: [{ size: "M", available: true }],
  inStock: true,
});

describe("ProductGrid", () => {
  it("renders one card per product in the given order", () => {
    render(<ProductGrid products={[make("b"), make("a")]} />);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Prenda b",
      "Prenda a",
    ]);
  });

  it("shows the empty state when there are no products", () => {
    render(<ProductGrid products={[]} />);
    expect(screen.getByText("Todavía no hay prendas publicadas.")).toBeInTheDocument();
  });
});
