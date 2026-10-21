import { render, screen } from "@testing-library/react";
import type {
  CatalogProduct,
  CatalogProductDetail,
  CatalogSettingsView,
} from "../../../lib/catalog-view";
import HomePage, { dynamic } from "./page";

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola {producto}",
  heroText: "Texto de portada configurado.",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};
const products: CatalogProduct[] = [
  {
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
    brand: "Átika",
  },
];

const listProducts = vi.fn(async (..._args: unknown[]): Promise<CatalogProduct[]> => products);
const detail = {
  ...products[0],
  color: null,
  description: "Lino fresco",
  images: [],
} as CatalogProductDetail;
const getProductDetail = vi.fn(
  async (..._args: unknown[]): Promise<CatalogProductDetail | null> => detail,
);
const countProductsByCategory = vi.fn(async (..._args: unknown[]) => ({
  novedades: 1,
  vestidos: 1,
  tops: 0,
  "faldas-y-shorts": 0,
  accesorios: 0,
}));
vi.mock("next/navigation", () => ({ useRouter: () => ({ replace: vi.fn() }) }));
vi.mock("../../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listProducts: (...args: unknown[]) => listProducts(...args),
  getProductDetail: (...args: unknown[]) => getProductDetail(...args),
  countProductsByCategory: (...args: unknown[]) => countProductsByCategory(...args),
}));

const searchParams = (params: Record<string, string> = {}) => Promise.resolve(params);

describe("Catalog home page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("is the Novedades list under a display-font title, with the rail counts", async () => {
    render(await HomePage({ searchParams: searchParams() }));
    expect(screen.getByRole("heading", { level: 1, name: "Novedades" })).toHaveClass(
      "font-display",
    );
    expect(screen.getByText("1 prenda")).toBeInTheDocument();
    expect(screen.getAllByRole("link", { name: /Vestidos/ })[0]).toHaveAttribute(
      "href",
      "/ver-todo/vestidos",
    );
  });

  it("lists every published product without a category filter", async () => {
    render(await HomePage({ searchParams: searchParams() }));
    expect(listProducts.mock.calls.at(-1)?.[2]).toBeNull();
    expect(screen.getByText("Vestido Lino")).toBeInTheDocument();
  });

  it("passes size, search and sort from the URL to the queries", async () => {
    render(
      await HomePage({
        searchParams: searchParams({ talle: "S", q: "aros", orden: "precio-desc" }),
      }),
    );
    const filters = { talle: "S", q: "aros", orden: "precio-desc" };
    expect(listProducts.mock.calls.at(-1)?.[3]).toMatchObject(filters);
    expect(countProductsByCategory.mock.calls.at(-1)?.[2]).toMatchObject({
      talle: "S",
      q: "aros",
    });
    expect(screen.getByText("1 prenda · talle S · “aros”")).toBeInTheDocument();
  });

  it("falls back to no filter for invalid values", async () => {
    render(await HomePage({ searchParams: searchParams({ talle: "XXL", orden: "azar" }) }));
    expect(listProducts.mock.calls.at(-1)?.[3]).toMatchObject({
      talle: null,
      orden: "recientes",
    });
  });

  it("shows the empty state when nothing is published", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await HomePage({ searchParams: searchParams() }));
    expect(screen.getByText("Todavía no hay prendas publicadas.")).toBeInTheDocument();
  });

  it("explains an empty filtered list and offers to clear the filters", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await HomePage({ searchParams: searchParams({ talle: "S" }) }));
    expect(screen.getByText("No encontramos prendas con esos filtros.")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Quitar filtros" })).toHaveAttribute(
      "href",
      "/ver-todo",
    );
  });

  it("opens the detail sheet over the list when ?p= names a published product", async () => {
    render(await HomePage({ searchParams: searchParams({ p: "1", talle: "M" }) }));
    expect(getProductDetail.mock.calls.at(-1)?.[2]).toBe("1");
    const dialog = screen.getByRole("dialog", { name: "Vestido Lino" });
    expect(dialog).toBeInTheDocument();
    // Closing returns to the same list without p.
    expect(screen.getAllByRole("link", { name: "Cerrar" })[0]).toHaveAttribute(
      "href",
      "/ver-todo?talle=M",
    );
    // The list is still rendered behind it, with its row highlighted.
    expect(screen.getByRole("link", { name: "Vestido Lino" })).toBeInTheDocument();
  });

  it("ignores ?p= when the product is unknown or unpublished", async () => {
    getProductDetail.mockResolvedValueOnce(null);
    render(await HomePage({ searchParams: searchParams({ p: "nope" }) }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(screen.getByText("Vestido Lino")).toBeInTheDocument();
  });

  it("does not look for a product when ?p= is absent", async () => {
    getProductDetail.mockClear();
    render(await HomePage({ searchParams: searchParams() }));
    expect(getProductDetail).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
