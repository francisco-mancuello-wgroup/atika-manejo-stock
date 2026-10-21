import { render, screen, within } from "@testing-library/react";
import { parseCatalogFilters } from "../lib/catalog-filters";
import type { CatalogProduct } from "../lib/catalog-view";
import { ProductRows } from "./product-rows";

const product: CatalogProduct = {
  id: "abc",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 450_000,
  discountPercent: null,
  discountedPriceGs: null,
  sizes: [
    { size: "S", available: true },
    { size: "M", available: false },
  ],
  inStock: true,
  imageUrl: null,
  detail: "Verde · Lino fresco",
  brand: "Casa Icona",
};

function renderRows(
  products: CatalogProduct[] = [product],
  extra: Partial<{ selectedId: string | null; filters: string }> = {},
) {
  const params = Object.fromEntries(new URLSearchParams(extra.filters ?? ""));
  return render(
    <ProductRows
      products={products}
      slug="vestidos"
      filters={parseCatalogFilters(params)}
      selectedId={extra.selectedId ?? null}
      whatsappNumber="+595 981 123 456"
      messageTemplate="Hola! {producto} talle {talle}"
    />,
  );
}

describe("ProductRows", () => {
  it("renders one row per product in the given order", () => {
    renderRows([
      { ...product, id: "b", name: "Prenda b" },
      { ...product, id: "a", name: "Prenda a" },
    ]);
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual([
      "Prenda b",
      "Prenda a",
    ]);
  });

  it("opens the detail sheet through a link on the name that keeps the filters", () => {
    renderRows([product], { filters: "talle=S&q=lino&orden=precio-asc" });
    expect(screen.getByRole("link", { name: "Vestido Lino" })).toHaveAttribute(
      "href",
      "/ver-todo/vestidos?talle=S&q=lino&orden=precio-asc&p=abc",
    );
  });

  it("shows brand eyebrow, name in the sans font and the detail line", () => {
    renderRows();
    expect(screen.getByText("Casa Icona")).toHaveClass("uppercase", "text-muted");
    expect(screen.getByRole("heading", { level: 3, name: "Vestido Lino" })).not.toHaveClass(
      "font-display",
    );
    expect(screen.getByText("Verde · Lino fresco")).toHaveClass("text-muted");
  });

  it("omits the eyebrow and the detail line when there is nothing to show", () => {
    renderRows([{ ...product, brand: null, detail: null }]);
    expect(screen.queryByText("Casa Icona")).toBeNull();
    expect(screen.queryByText("Verde · Lino fresco")).toBeNull();
  });

  it("lists the sizes as chips, sold-out ones struck through", () => {
    renderRows();
    const sizes = screen.getByRole("list", { name: "Talles de Vestido Lino" });
    const chips = within(sizes).getAllByRole("listitem");
    expect(chips.map((chip) => chip.textContent)).toEqual(["S", "M"]);
    expect(chips[0]).toHaveClass("border-ink");
    expect(chips[1]).toHaveClass("line-through");
  });

  it("shows the struck price, the discounted price and the badge of a discounted product", () => {
    renderRows([{ ...product, discountPercent: 20, discountedPriceGs: 360_000 }]);
    expect(screen.getAllByText("₲ 450.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("₲ 450.000")[0]?.tagName).toBe("S");
    expect(screen.getAllByText("₲ 360.000").length).toBeGreaterThan(0);
    expect(screen.getAllByText("-20 %").length).toBeGreaterThan(0);
  });

  it("puts the discounted price in the row's WhatsApp message", () => {
    renderRows([{ ...product, discountPercent: 20, discountedPriceGs: 360_000 }]);
    const link = screen.getByRole("link", { name: "Consultar Vestido Lino por WhatsApp" });
    const text = new URL(link.getAttribute("href") ?? "").searchParams.get("text");
    expect(text).toBe("Hola! Vestido Lino – ₲\u00a0360.000 (-20 %)");
  });

  it("shows the price with the IVA note, in the display font", () => {
    renderRows();
    const prices = screen.getAllByText(/450\.000/);
    expect(prices.length).toBeGreaterThan(0);
    expect(prices[0]).toHaveClass("font-display");
    expect(screen.getByText("IVA incluido")).toBeInTheDocument();
  });

  it("asks to consult the price when prices are hidden", () => {
    renderRows([{ ...product, priceGs: null }]);
    expect(screen.getAllByText("Consultar precio").length).toBeGreaterThan(0);
    expect(screen.queryByText("IVA incluido")).toBeNull();
  });

  it("links the WhatsApp button straight to the product, without a size", () => {
    renderRows();
    const link = screen.getByRole("link", { name: "Consultar Vestido Lino por WhatsApp" });
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    expect(link).toHaveClass("bg-wa");
    const url = new URL(link.getAttribute("href") ?? "");
    expect(url.origin + url.pathname).toBe("https://wa.me/595981123456");
    expect(url.searchParams.get("text")).toBe("Hola! Vestido Lino");
  });

  it("does not nest the WhatsApp link inside the row link", () => {
    renderRows();
    const open = screen.getByRole("link", { name: "Vestido Lino" });
    const wa = screen.getByRole("link", { name: "Consultar Vestido Lino por WhatsApp" });
    expect(open.contains(wa)).toBe(false);
  });

  it("highlights the row whose sheet is open", () => {
    renderRows([product, { ...product, id: "z", name: "Otra" }], { selectedId: "z" });
    const rows = screen.getAllByRole("listitem").filter((li) => li.querySelector("h3"));
    expect(rows[0]).not.toHaveClass("bg-subtle");
    expect(rows[1]).toHaveClass("bg-subtle");
  });

  it("shows the cover photo with the sand offset, named after the product", () => {
    renderRows([{ ...product, imageUrl: "/media/products/atika/top.webp" }]);
    const photo = screen.getByRole("img", { name: "Vestido Lino" });
    expect(photo.getAttribute("src")).toContain(
      encodeURIComponent("/media/products/atika/top.webp"),
    );
    expect(photo).toHaveClass("object-cover");
    expect(photo.parentElement?.className).toContain("var(--color-sand)");
  });

  it("shows an empty subtle placeholder with the offset when there is no photo", () => {
    const { container } = renderRows();
    const box = container.querySelector(".bg-subtle");
    expect(box?.className).toContain("var(--color-sand)");
    expect(box?.childElementCount).toBe(0);
    expect(screen.queryByRole("img")).toBeNull();
  });

  it("says when no size is available", () => {
    renderRows([{ ...product, sizes: [], inStock: false }]);
    expect(screen.getByText("Sin stock")).toBeInTheDocument();
  });
});
