import { render, screen } from "@testing-library/react";
import type { CatalogProduct, CatalogSettingsView } from "../../../../lib/catalog-view";
import CategoryPage, { dynamic } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola {producto}",
  heroText: "Hero",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};
const dress: CatalogProduct = {
  id: "1",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 1000,
  discountPercent: null,
  discountedPriceGs: null,
  sizes: [{ size: "M", available: true }],
  inStock: true,
  imageUrl: null,
  detail: null,
  brand: null,
};

const listProducts = vi.fn(async (..._args: unknown[]): Promise<CatalogProduct[]> => [dress]);
vi.mock("../../../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listProducts: (...args: unknown[]) => listProducts(...args),
  countProductsByCategory: async () => ({
    novedades: 3,
    vestidos: 1,
    tops: 2,
    "faldas-y-shorts": 0,
    accesorios: 0,
  }),
}));

const props = (categoria: string, search: Record<string, string> = {}) => ({
  params: Promise.resolve({ categoria }),
  searchParams: Promise.resolve(search),
});

describe("catalog category page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("lists the products of a category under its title, marked in the rail", async () => {
    render(await CategoryPage(props("vestidos")));
    expect(screen.getByRole("heading", { level: 1, name: "Vestidos" })).toBeInTheDocument();
    expect(screen.getByText("Vestido Lino")).toBeInTheDocument();
    expect(listProducts.mock.calls.at(-1)?.[2]).toBe("vestidos");
    expect(
      screen.getAllByRole("link", { name: /Vestidos/ }).some((a) => a.ariaCurrent === "page"),
    ).toBe(true);
  });

  it("lists every published product for novedades", async () => {
    render(await CategoryPage(props("novedades")));
    expect(screen.getByRole("heading", { level: 1, name: "Novedades" })).toBeInTheDocument();
    expect(listProducts.mock.calls.at(-1)?.[2]).toBeNull();
  });

  it("applies the filters of the URL inside the category", async () => {
    render(await CategoryPage(props("tops", { talle: "M", orden: "precio-asc" })));
    expect(listProducts.mock.calls.at(-1)?.[2]).toBe("tops");
    expect(listProducts.mock.calls.at(-1)?.[3]).toMatchObject({ talle: "M", orden: "precio-asc" });
  });

  it("shows the empty state for a category without products", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await CategoryPage(props("accesorios")));
    expect(screen.getByText("Todavía no hay prendas publicadas.")).toBeInTheDocument();
  });

  it("clears the filters back to the category when a filtered list is empty", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await CategoryPage(props("tops", { q: "zzz", orden: "precio-asc" })));
    expect(screen.getByText("No encontramos prendas con esos filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quitar filtros" })).toHaveAttribute(
      "href",
      "/ver-todo/tops",
    );
  });

  it("responds not found for an unknown category", async () => {
    await expect(CategoryPage(props("zapatos"))).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
