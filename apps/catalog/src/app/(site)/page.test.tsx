import { render, screen, within } from "@testing-library/react";
import type { CatalogSettingsView } from "../../lib/catalog-view";
import type { CollectionSummary } from "../../lib/presentation";
import HomePage, { dynamic } from "./page";

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola {producto}",
  heroText: "x",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};
const collections: CollectionSummary[] = [
  { slug: "casa-icona", name: "Casa Icona", count: 18, coverUrl: "/media/products/a.webp" },
  { slug: "atika", name: "Átika", count: 1, coverUrl: null },
];
const listCollections = vi.fn(async (..._args: unknown[]) => collections);
vi.mock("../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listCollections: (...args: unknown[]) => listCollections(...args),
}));

describe("Collections index", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("has a display title and one card per collection linking to its presentation", async () => {
    render(await HomePage());
    expect(screen.getByRole("heading", { level: 1, name: "Colecciones" })).toHaveClass(
      "font-display",
    );
    const casa = screen.getByRole("link", { name: /Casa Icona/ });
    expect(casa).toHaveAttribute("href", "/catalogos/casa-icona");
    expect(within(casa).getByText("18 piezas")).toBeInTheDocument();
    expect(within(casa).getByRole("img", { name: "Casa Icona" })).toBeInTheDocument();
    const atika = screen.getByRole("link", { name: /Átika/ });
    expect(atika).toHaveAttribute("href", "/catalogos/atika");
    expect(within(atika).getByText("1 pieza")).toBeInTheDocument();
    expect(within(atika).queryByRole("img")).toBeNull();
  });

  it("links to the whole catalog list", async () => {
    render(await HomePage());
    expect(screen.getByRole("link", { name: "Ver todo el catálogo" })).toHaveAttribute(
      "href",
      "/ver-todo",
    );
  });

  it("explains when there are no collections yet", async () => {
    listCollections.mockResolvedValueOnce([]);
    render(await HomePage());
    expect(screen.getByText("Todavía no hay colecciones publicadas.")).toBeInTheDocument();
  });
});
