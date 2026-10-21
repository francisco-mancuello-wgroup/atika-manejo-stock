import { render, screen } from "@testing-library/react";
import type { CatalogProduct, CatalogSettingsView } from "../../../lib/catalog-view";
import ProductPage, { dynamic } from "./page";

vi.mock("next/navigation", () => ({
  notFound: vi.fn(() => {
    throw new Error("NEXT_NOT_FOUND");
  }),
}));

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola! {producto} talle {talle}",
  heroText: "Hero",
  showPrices: true,
  showSoldOutSizes: true,
  hideOutOfStock: true,
};
const product: CatalogProduct = {
  id: "1",
  name: "Vestido Lino",
  category: "vestidos",
  priceGs: 450_000,
  sizes: [
    { size: "M", available: true },
    { size: "L", available: false },
  ],
  inStock: true,
  imageUrl: null,
  brand: null,
};

const getProduct = vi.fn(async (): Promise<CatalogProduct | null> => product);
vi.mock("../../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  getProduct: () => getProduct(),
}));

const params = Promise.resolve({ id: "1" });

describe("catalog product page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("shows name, price with IVA note, sizes and the WhatsApp link", async () => {
    render(await ProductPage({ params }));
    expect(screen.getByRole("heading", { level: 1, name: "Vestido Lino" })).toHaveClass(
      "font-display",
    );
    expect(screen.getByText(/450\.000/)).toBeInTheDocument();
    expect(screen.getByText("IVA incluido")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "M" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "L" })).toBeDisabled();
    expect(screen.getByRole("link", { name: "Consultar por WhatsApp" })).toHaveAttribute(
      "href",
      expect.stringContaining("https://wa.me/595981123456?text="),
    );
  });

  it("shows the cover photo when the product has one, a placeholder otherwise", async () => {
    getProduct.mockResolvedValueOnce({ ...product, imageUrl: "/media/products/atika/top.webp" });
    const { unmount } = render(await ProductPage({ params }));
    expect(screen.getByRole("img", { name: "Vestido Lino" }).getAttribute("src")).toContain(
      encodeURIComponent("/media/products/atika/top.webp"),
    );
    unmount();

    const { container } = render(await ProductPage({ params }));
    expect(screen.queryByRole("img")).toBeNull();
    expect(container.querySelector(".bg-subtle")).not.toBeNull();
  });

  it("asks to consult the price when the price is hidden", async () => {
    getProduct.mockResolvedValueOnce({ ...product, priceGs: null });
    render(await ProductPage({ params }));
    expect(screen.getByText("Consultar precio")).toBeInTheDocument();
    expect(screen.queryByText("IVA incluido")).not.toBeInTheDocument();
  });

  it("responds not found for an unknown or unpublished product", async () => {
    getProduct.mockResolvedValueOnce(null);
    await expect(ProductPage({ params })).rejects.toThrow("NEXT_NOT_FOUND");
  });
});
