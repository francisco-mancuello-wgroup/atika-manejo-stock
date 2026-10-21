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
};

describe("ProductCard", () => {
  it("links to the product page with name, price and available sizes", () => {
    render(<ProductCard product={product} />);
    expect(screen.getByRole("link", { name: /Vestido Lino/ })).toHaveAttribute(
      "href",
      "/producto/abc",
    );
    expect(screen.getByRole("heading", { level: 3, name: "Vestido Lino" })).toHaveClass(
      "font-display",
    );
    expect(screen.getByText(/450\.000/)).toBeInTheDocument();
    expect(screen.getByText("S · M")).toBeInTheDocument();
  });

  it("asks to consult the price when prices are hidden", () => {
    render(<ProductCard product={{ ...product, priceGs: null }} />);
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
  });

  it("shows the cover photo inside the sand offset frame, named after the product", () => {
    const { container } = render(
      <ProductCard product={{ ...product, imageUrl: "/media/products/atika/top.webp" }} />,
    );
    const photo = screen.getByRole("img", { name: "Vestido Lino" });
    expect(photo.getAttribute("src")).toContain(
      encodeURIComponent("/media/products/atika/top.webp"),
    );
    expect(photo).toHaveClass("object-cover");
    expect(photo).toHaveAttribute("sizes", expect.stringContaining("vw"));
    expect(container.querySelector(".bg-sand")).not.toBeNull();
  });

  it("shows a sand photo placeholder and says when nothing is available", () => {
    const { container } = render(
      <ProductCard product={{ ...product, sizes: [], inStock: false }} />,
    );
    expect(container.querySelector(".bg-sand")).not.toBeNull();
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });
});
