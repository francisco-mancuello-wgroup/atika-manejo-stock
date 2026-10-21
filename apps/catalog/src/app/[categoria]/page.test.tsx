import { render, screen } from "@testing-library/react";
import type { CatalogProduct, CatalogSettingsView } from "../../lib/catalog-view";
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
  sizes: [{ size: "M", available: true }],
  inStock: true,
  imageUrl: null,
};

const listProducts = vi.fn(
  async (_db: unknown, _settings: unknown, _category: string | null): Promise<CatalogProduct[]> => [
    dress,
  ],
);
vi.mock("../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listProducts: (db: unknown, s: unknown, category: string | null) => listProducts(db, s, category),
}));

describe("catalog category page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("lists the products of a category under its title", async () => {
    render(await CategoryPage({ params: Promise.resolve({ categoria: "vestidos" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Vestidos" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: "Vestido Lino" })).toBeInTheDocument();
    expect(listProducts.mock.calls.at(-1)?.[2]).toBe("vestidos");
  });

  it("lists every published product for novedades", async () => {
    render(await CategoryPage({ params: Promise.resolve({ categoria: "novedades" }) }));
    expect(screen.getByRole("heading", { level: 1, name: "Novedades" })).toBeInTheDocument();
    expect(listProducts.mock.calls.at(-1)?.[2]).toBeNull();
  });

  it("shows the empty state for a category without products", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await CategoryPage({ params: Promise.resolve({ categoria: "accesorios" }) }));
    expect(screen.getByText("Todavía no hay prendas publicadas.")).toBeInTheDocument();
  });

  it("responds not found for an unknown category", async () => {
    await expect(
      CategoryPage({ params: Promise.resolve({ categoria: "zapatos" }) }),
    ).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
