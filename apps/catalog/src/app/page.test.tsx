import { render, screen } from "@testing-library/react";
import type { CatalogProduct, CatalogSettingsView } from "../lib/catalog-view";
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
    sizes: [{ size: "M", available: true }],
    inStock: true,
    imageUrl: null,
    detail: null,
    brand: "Átika",
  },
];

const listProducts = vi.fn(async (): Promise<CatalogProduct[]> => products);
vi.mock("../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listProducts: (...args: unknown[]) => listProducts(...(args as [])),
}));

describe("Catalog home page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("sets the configured hero text in the display serif font and keeps the pricing note", async () => {
    render(await HomePage());
    const heading = screen.getByRole("heading", {
      level: 1,
      name: "Texto de portada configurado.",
    });
    expect(heading).toHaveClass("font-display");
    expect(screen.getByText("Novedades")).toBeInTheDocument();
    expect(
      screen.getByText("Precios con IVA incluido · Consultas y reservas por WhatsApp"),
    ).toBeInTheDocument();
  });

  it("lists the published products", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 3, name: "Vestido Lino" })).toBeInTheDocument();
  });

  it("shows the empty state when nothing is published", async () => {
    listProducts.mockResolvedValueOnce([]);
    render(await HomePage());
    expect(screen.getByText("Todavía no hay prendas publicadas.")).toBeInTheDocument();
  });
});
