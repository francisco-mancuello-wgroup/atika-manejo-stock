import { render, screen, within } from "@testing-library/react";
import type { PublicBankPromo } from "../../lib/bank-promos";
import type { CatalogSettingsView } from "../../lib/catalog-view";
import PromosBancariasPage, { dynamic } from "./page";

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 123 456",
  messageTemplate: "Hola!",
  heroText: "Hero",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};

const promos: PublicBankPromo[] = [
  {
    id: "p1",
    name: "Cuotas Itaú y Continental",
    headline: "Hasta 12 cuotas sin intereses",
    kind: "installments",
    banks: [
      { id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" },
      { id: "b2", name: "Continental", logoUrl: null },
    ],
    startsAt: null,
    endsAt: "2026-12-31",
    terms: "Válido con tarjetas de crédito.\nNo acumulable.",
    appliesTo: "all",
  },
  {
    id: "p2",
    name: null,
    headline: "20 % de reintegro · Jueves · Tope ₲ 200.000",
    kind: "refund",
    banks: [{ id: "b1", name: "Itaú", logoUrl: null }],
    startsAt: "2026-11-01",
    endsAt: "2026-11-30",
    terms: null,
    appliesTo: "selected",
  },
];

const listPublicBankPromos = vi.fn(async (): Promise<PublicBankPromo[]> => promos);
vi.mock("../../lib/db", () => ({ getDb: () => ({}) }));
vi.mock("../../lib/queries", () => ({
  getCatalogSettings: async () => settings,
  listPublicBankPromos: () => listPublicBankPromos(),
}));

describe("bank promotions page", () => {
  it("renders on demand because it reads the database", () => {
    expect(dynamic).toBe("force-dynamic");
  });

  it("lists every live promo with banks, window, scope and terms", async () => {
    render(await PromosBancariasPage());
    expect(screen.getByRole("heading", { level: 1, name: "Promociones bancarias" })).toBeVisible();
    const articles = screen.getAllByRole("article");
    expect(articles).toHaveLength(2);

    const first = within(articles[0] as HTMLElement);
    expect(first.getByRole("heading", { name: "Cuotas Itaú y Continental" })).toBeVisible();
    expect(first.getByText("Hasta 12 cuotas sin intereses")).toBeVisible();
    expect(first.getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(first.getByText("Continental")).toBeInTheDocument();
    expect(first.getByText("Hasta el 31/12/2026")).toBeInTheDocument();
    expect(first.getByText("Todos los productos")).toBeInTheDocument();
    expect(first.getByText(/Válido con tarjetas de crédito\./)).toHaveClass("whitespace-pre-line");

    const second = within(articles[1] as HTMLElement);
    expect(
      second.getByRole("heading", { name: "20 % de reintegro · Jueves · Tope ₲ 200.000" }),
    ).toBeVisible();
    expect(second.getAllByText(/20 % de reintegro/)).toHaveLength(1);
    expect(second.getByText("Del 01/11/2026 al 30/11/2026")).toBeInTheDocument();
    expect(second.getByText("Productos seleccionados")).toBeInTheDocument();
    expect(second.queryByText(/bases/i)).not.toBeInTheDocument();
  });

  it("links back to the catalogs", async () => {
    render(await PromosBancariasPage());
    expect(screen.getByRole("link", { name: /Catálogos/ })).toHaveAttribute("href", "/");
  });

  it("explains when there are no live promos", async () => {
    listPublicBankPromos.mockResolvedValueOnce([]);
    render(await PromosBancariasPage());
    expect(screen.getByText("Por ahora no hay promociones bancarias vigentes.")).toBeVisible();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });
});
