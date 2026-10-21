import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { CatalogProduct, CatalogSettingsView } from "../lib/queries/catalog";
import { CatalogoWebView } from "./catalogo-web-view";

const products: CatalogProduct[] = [
  {
    id: "p1",
    name: "Vestido Lino",
    lotName: "Casa Icona",
    priceGs: 450_000,
    category: "vestidos",
    isPublished: true,
    sizes: ["S", "M"],
  },
  {
    id: "p2",
    name: "Top Seda",
    lotName: "Milonga",
    priceGs: 120_000,
    category: null,
    isPublished: false,
    sizes: [],
  },
];

const settings: CatalogSettingsView = {
  whatsappNumber: "+595 981 000 000",
  messageTemplate: "Hola! {producto} talle {talle}",
  heroText: "Prendas seleccionadas.",
  showPrices: true,
  showSoldOutSizes: false,
  hideOutOfStock: true,
};

const idleAction = async (): Promise<FormState> => ({ status: "idle" });
const actions = {
  setVisibility: vi.fn(idleAction),
  setCategory: vi.fn(idleAction),
  setVisibilityMany: vi.fn(idleAction),
  publishAll: idleAction,
  saveSettings: idleAction,
};

describe("CatalogoWebView", () => {
  it("lists each product with lot, available sizes, price, category and visibility", () => {
    render(
      <CatalogoWebView
        products={products}
        settings={settings}
        filters={{ status: "todos" }}
        actions={actions}
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Catálogo web" })).toBeInTheDocument();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByText("Vestido Lino")).toBeInTheDocument();
    expect(first.getByText("Casa Icona")).toBeInTheDocument();
    expect(first.getByText("S · M")).toBeInTheDocument();
    expect(first.getByText(/450\.000/)).toBeInTheDocument();
    expect(first.getByRole("combobox")).toHaveValue("vestidos");
    expect(first.getByRole("switch")).toHaveAttribute("aria-checked", "true");
    expect(within(rows[1] as HTMLElement).getByText("Sin stock")).toBeInTheDocument();
  });

  it("offers status filters as links that keep the search and marks the active one", () => {
    render(
      <CatalogoWebView
        products={products}
        settings={settings}
        filters={{ status: "ocultos", query: "top" }}
        actions={actions}
      />,
    );
    const nav = screen.getByRole("navigation", { name: "Filtro por estado" });
    expect(
      within(nav)
        .getAllByRole("link")
        .map((l) => l.textContent),
    ).toEqual(["Todos", "Visibles", "Ocultos", "Sin stock"]);
    expect(within(nav).getByRole("link", { name: "Ocultos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Visibles" })).toHaveAttribute(
      "href",
      "/catalogo-web?estado=visibles&q=top",
    );
    expect(within(nav).getByRole("link", { name: "Todos" })).toHaveAttribute(
      "href",
      "/catalogo-web?q=top",
    );
    expect(screen.getByRole("searchbox", { name: "Buscar" })).toHaveValue("top");
  });

  it("shows an empty message when nothing matches", () => {
    render(
      <CatalogoWebView
        products={[]}
        settings={settings}
        filters={{ status: "todos" }}
        actions={actions}
      />,
    );
    expect(screen.getByText("No hay productos que coincidan con el filtro.")).toBeInTheDocument();
  });

  it("has the bulk publish button and the settings form with the current values", () => {
    render(
      <CatalogoWebView
        products={products}
        settings={settings}
        filters={{ status: "todos" }}
        actions={actions}
      />,
    );
    expect(screen.getByRole("button", { name: "Publicar todos con stock" })).toBeInTheDocument();
    expect(screen.getByLabelText("Número de WhatsApp")).toHaveValue("+595 981 000 000");
    expect(screen.getByLabelText("Mensaje")).toHaveValue("Hola! {producto} talle {talle}");
    expect(screen.getByLabelText("Texto de portada")).toHaveValue("Prendas seleccionadas.");
    expect(screen.getByRole("switch", { name: "Mostrar precios" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    expect(screen.getByRole("switch", { name: "Mostrar talles agotados" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByRole("switch", { name: "Ocultar productos sin stock" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("submits the switches as form values", async () => {
    const saveSettings = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Configuración guardada.",
      }),
    );
    render(
      <CatalogoWebView
        products={products}
        settings={settings}
        filters={{ status: "todos" }}
        actions={{ ...actions, saveSettings }}
      />,
    );
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar talles agotados" }));
    fireEvent.click(screen.getByRole("switch", { name: "Mostrar precios" }));
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar configuración" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Configuración guardada.");
    const data = saveSettings.mock.calls[0]?.[1] as FormData;
    expect(data.get("showSoldOutSizes")).toBe("on");
    expect(data.get("showPrices")).toBeNull();
    expect(data.get("hideOutOfStock")).toBe("on");
    expect(data.get("whatsappNumber")).toBe("+595 981 000 000");
  });

  it("offers a header switch that applies visibility to every listed product", () => {
    render(
      <CatalogoWebView
        products={products}
        settings={settings}
        filters={{ status: "todos" }}
        actions={actions}
      />,
    );
    const header = screen.getAllByRole("row")[0] as HTMLElement;
    const bulk = within(header).getByRole("switch", { name: "Visibles: todos los de la lista" });
    expect(bulk).toHaveAttribute("aria-checked", "false");
    fireEvent.click(bulk);
    expect(actions.setVisibilityMany).toHaveBeenCalledWith(["p1", "p2"], true);
  });
});
