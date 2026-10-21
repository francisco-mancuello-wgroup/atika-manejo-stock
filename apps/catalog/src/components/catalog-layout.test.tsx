import { fireEvent, render, screen, within } from "@testing-library/react";
import { parseCatalogFilters } from "../lib/catalog-filters";
import { CatalogLayout } from "./catalog-layout";

const counts = { novedades: 113, vestidos: 40, tops: 25, "faldas-y-shorts": 0, accesorios: 12 };
const none = parseCatalogFilters({});

function renderLayout(
  props: Partial<{ slug: string; filters: ReturnType<typeof parseCatalogFilters>; total: number }>,
) {
  return render(
    <CatalogLayout
      slug={props.slug ?? "novedades"}
      filters={props.filters ?? none}
      counts={counts}
      total={props.total ?? 113}
    >
      <p>rows go here</p>
    </CatalogLayout>,
  );
}

describe("CatalogLayout rail", () => {
  it("lists the categories with their counts as links", () => {
    renderLayout({});
    const rail = screen.getByRole("navigation", { name: "Categorías" });
    const items = within(rail)
      .getAllByRole("link")
      .map((link) => [link.textContent, link.getAttribute("href")]);
    expect(items).toEqual([
      ["Novedades113", "/novedades"],
      ["Vestidos40", "/vestidos"],
      ["Tops25", "/tops"],
      ["Faldas y shorts0", "/faldas-y-shorts"],
      ["Accesorios12", "/accesorios"],
    ]);
  });

  it("marks the current category and keeps size, search and sort in every link", () => {
    renderLayout({
      slug: "tops",
      filters: parseCatalogFilters({ talle: "S", q: "lino", orden: "precio-asc", p: "abc" }),
    });
    const rail = screen.getByRole("navigation", { name: "Categorías" });
    expect(within(rail).getByRole("link", { name: /Tops/ })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(rail).getByRole("link", { name: /Vestidos/ })).toHaveAttribute(
      "href",
      "/vestidos?talle=S&q=lino&orden=precio-asc",
    );
  });

  it("offers the size chips as links that toggle the size", () => {
    renderLayout({ slug: "vestidos", filters: parseCatalogFilters({ talle: "S", q: "lino" }) });
    const group = screen.getByRole("group", { name: "Talle" });
    const chips = within(group).getAllByRole("link");
    expect(chips.map((chip) => chip.textContent)).toEqual(["XS", "S", "M", "L", "XL", "U"]);
    expect(within(group).getByRole("link", { name: "S" })).toHaveAttribute("aria-current", "true");
    expect(within(group).getByRole("link", { name: "S" })).toHaveAttribute(
      "href",
      "/vestidos?q=lino",
    );
    expect(within(group).getByRole("link", { name: "M" })).toHaveAttribute(
      "href",
      "/vestidos?talle=M&q=lino",
    );
  });

  it("repeats the pricing note", () => {
    renderLayout({});
    expect(
      screen.getAllByText("Precios con IVA incluido. Consultas y reservas por WhatsApp.").length,
    ).toBeGreaterThan(0);
  });
});

describe("CatalogLayout compact navigation", () => {
  it("shows category tabs with the current one marked, without counts", () => {
    renderLayout({ slug: "accesorios" });
    const tabs = screen.getByRole("navigation", { name: "Categorías, vista compacta" });
    expect(
      within(tabs)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Novedades", "Vestidos", "Tops", "Faldas y shorts", "Accesorios"]);
    expect(within(tabs).getByRole("link", { name: "Accesorios" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("shows a size row with 'Todos' that clears the size", () => {
    renderLayout({ slug: "tops", filters: parseCatalogFilters({ talle: "M" }) });
    const row = screen.getByRole("group", { name: "Talle, vista compacta" });
    expect(
      within(row)
        .getAllByRole("link")
        .map((link) => link.textContent),
    ).toEqual(["Todos", "XS", "S", "M", "L", "XL", "U"]);
    expect(within(row).getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/tops");
    expect(within(row).getByRole("link", { name: "M" })).toHaveAttribute("aria-current", "true");
  });
});

describe("CatalogLayout header", () => {
  it("titles the list with the category in the display font and counts the garments", () => {
    renderLayout({ slug: "vestidos", total: 40 });
    const title = screen.getByRole("heading", { level: 1, name: "Vestidos" });
    expect(title).toHaveClass("font-display");
    expect(screen.getByText("40 prendas")).toBeInTheDocument();
  });

  it("uses the singular and mentions the size and the search", () => {
    renderLayout({ filters: parseCatalogFilters({ talle: "S", q: "aros" }), total: 1 });
    expect(screen.getByText("1 prenda · talle S · “aros”")).toBeInTheDocument();
  });

  it("offers the sort orders as links that keep the other filters", () => {
    renderLayout({ slug: "tops", filters: parseCatalogFilters({ talle: "S" }) });
    const button = screen.getByRole("button", { name: /Más recientes/ });
    expect(button).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(button);
    const cheap = screen.getByRole("link", { name: "Precio: menor a mayor" });
    expect(cheap).toHaveAttribute("href", "/tops?talle=S&orden=precio-asc");
    expect(screen.getByRole("link", { name: "Más recientes" })).toHaveAttribute(
      "href",
      "/tops?talle=S",
    );
  });

  it("renders the list below the header", () => {
    renderLayout({});
    expect(screen.getByText("rows go here")).toBeInTheDocument();
  });
});
