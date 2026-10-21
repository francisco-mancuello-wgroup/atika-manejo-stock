import { render, screen, within } from "@testing-library/react";
import type { InventoryProduct } from "../lib/view-models";
import { InventarioView } from "./inventario-view";

const products: InventoryProduct[] = [
  {
    id: "p1",
    name: "Vestido Lino",
    code: "A1",
    color: "Blanco",
    lotId: "lot-1",
    lotName: "Casa Icona",
    priceGs: 1_000_000,
    sizes: [
      { size: "S", stock: 0 },
      { size: "M", stock: 3 },
    ],
    totalStock: 3,
    imageUrl: "/media/products/casa-icona/vestido-lino.webp",
  },
  {
    id: "p2",
    name: "Pantalón",
    code: null,
    color: null,
    lotId: "lot-2",
    lotName: "Milonga",
    priceGs: 400_000,
    sizes: [{ size: "U", stock: 5 }],
    totalStock: 5,
    imageUrl: null,
  },
];

const lots = [
  { id: "lot-1", name: "Casa Icona" },
  { id: "lot-2", name: "Milonga" },
];

describe("InventarioView", () => {
  it("lists the products with lot, code, price and the count", () => {
    render(<InventarioView products={products} lots={lots} filters={{}} />);
    expect(screen.getByRole("heading", { level: 1, name: "Inventario" })).toBeInTheDocument();
    const row = screen.getByText("Vestido Lino").closest("tr") as HTMLElement;
    expect(within(row).getByText("Casa Icona")).toBeInTheDocument();
    expect(within(row).getByText("A1")).toBeInTheDocument();
    expect(within(row).getByText("₲ 1.000.000")).toBeInTheDocument();
    expect(screen.getByText("2 productos")).toBeInTheDocument();
  });

  it("shows a 40x52 thumbnail of the cover, or a sand placeholder", () => {
    render(<InventarioView products={products} lots={lots} filters={{}} />);
    const withPhoto = screen.getByText("Vestido Lino").closest("tr") as HTMLElement;
    const img = within(withPhoto).getByRole("img", { name: "Vestido Lino" });
    expect(img).toHaveAttribute("width", "40");
    expect(img).toHaveAttribute("height", "52");
    expect(img.getAttribute("src")).toContain(
      encodeURIComponent("/media/products/casa-icona/vestido-lino.webp"),
    );
    const withoutPhoto = screen.getByText("Pantalón").closest("tr") as HTMLElement;
    expect(within(withoutPhoto).queryByRole("img")).toBeNull();
    expect(withoutPhoto.querySelector(".bg-sand")).not.toBeNull();
  });

  it("shows a stock chip per size and marks sold-out sizes", () => {
    render(<InventarioView products={products} lots={lots} filters={{}} />);
    const row = screen.getByText("Vestido Lino").closest("tr") as HTMLElement;
    const soldOut = within(row).getByText("S 0");
    expect(soldOut).toHaveClass("bg-warnbg", "text-warn");
    const available = within(row).getByText("M 3");
    expect(available).not.toHaveClass("bg-warnbg");
  });

  it("renders a GET filter form prefilled from the current filters", () => {
    render(
      <InventarioView
        products={products}
        lots={lots}
        filters={{ lotId: "lot-2", query: "pant" }}
      />,
    );
    // jsdom has no implicit role for <search>, so look the element up directly.
    const search = screen.getByLabelText("Lote").closest("search") as HTMLElement;
    expect(search).toBeInTheDocument();
    expect(search.querySelector("form")).toHaveAttribute("method", "get");
    const form = search;
    expect(within(form).getByLabelText("Lote")).toHaveValue("lot-2");
    expect(within(form).getByLabelText("Buscar")).toHaveValue("pant");
    expect(within(form).getByRole("option", { name: "Todos los lotes" })).toHaveValue("");
    expect(screen.getByRole("link", { name: "Limpiar" })).toHaveAttribute("href", "/inventario");
  });

  it("explains when nothing matches", () => {
    render(<InventarioView products={[]} lots={lots} filters={{ query: "zzz" }} />);
    expect(screen.getByText("No hay productos que coincidan con el filtro.")).toBeInTheDocument();
  });

  it("links each product to its edit page and offers a new product button", () => {
    render(<InventarioView products={products} lots={lots} filters={{}} />);
    expect(screen.getByRole("link", { name: "Vestido Lino" })).toHaveAttribute(
      "href",
      "/inventario/p1",
    );
    expect(screen.getByRole("link", { name: "Pantalón" })).toHaveAttribute(
      "href",
      "/inventario/p2",
    );
    expect(screen.getByRole("link", { name: "Nuevo producto" })).toHaveAttribute(
      "href",
      "/inventario/nuevo",
    );
  });
});
