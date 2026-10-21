import { render, screen } from "@testing-library/react";
import type { CatalogProduct } from "../lib/catalog-view";
import { ProductCard } from "./product-card";

const product: CatalogProduct = {
  id: "abc",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 450_000,
  sizes: [
    { size: "S", available: true },
    { size: "M", available: true },
  ],
  inStock: true,
  imageUrl: null,
  detail: null,
  brand: "Casa Icona",
};

describe("ProductCard", () => {
  it("links to the product page", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("link", { name: /Vestido Lino/ })).toHaveAttribute(
      "href",
      "/producto/abc",
    );
  });

  it("shows eyebrow, then name and price in the same row, in the sans font", () => {
    render(<ProductCard product={product} />);
    const name = screen.getByRole("heading", { level: 3, name: "Vestido Lino" });
    expect(name).not.toHaveClass("font-display");
    const price = screen.getByText(/450\.000/);
    expect(price.parentElement).toBe(name.parentElement);
    expect(name.parentElement).toHaveClass("justify-between");
    expect(price).toHaveClass("whitespace-nowrap");
    expect(screen.getByText("Casa Icona")).toHaveClass("text-muted", "uppercase");
  });

  it("lists the available sizes as 'Talles: ...'", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByText("Talles: S · M")).toBeInTheDocument();
  });

  it("asks to consult the price when prices are hidden", () => {
    render(<ProductCard product={{ ...product, priceGs: null }} />);
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
  });

  it("omits the eyebrow when there is no brand", () => {
    render(<ProductCard product={{ ...product, brand: null }} />);
    expect(screen.queryByText("Casa Icona")).toBeNull();
  });

  it("shows the cover photo with a hard sand offset, named after the product", () => {
    render(<ProductCard product={{ ...product, imageUrl: "/media/products/atika/top.webp" }} />);
    const photo = screen.getByRole("img", { name: "Vestido Lino" });
    expect(photo.getAttribute("src")).toContain(
      encodeURIComponent("/media/products/atika/top.webp"),
    );
    expect(photo).toHaveClass("object-cover");
    expect(photo).toHaveAttribute("sizes", expect.stringContaining("vw"));
    expect(photo.parentElement?.className).toContain("var(--color-sand)");
  });

  it("shows an empty subtle placeholder with the sand offset, and says when nothing is available", () => {
    const { container } = render(
      <ProductCard product={{ ...product, sizes: [], inStock: false }} />,
    );
    const box = container.querySelector(".bg-subtle");
    expect(box).not.toBeNull();
    expect(box?.className).toContain("var(--color-sand)");
    expect(box?.childElementCount).toBe(0);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });
});
