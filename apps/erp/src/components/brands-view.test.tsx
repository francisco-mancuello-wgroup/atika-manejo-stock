import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { BrandRow } from "../lib/brands/save";
import { BrandsView } from "./brands-view";

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const brand = (overrides: Partial<BrandRow> & Pick<BrandRow, "id" | "name">): BrandRow => ({
  slug: overrides.name.toLowerCase(),
  isActive: true,
  isFallback: false,
  position: 0,
  coverUrl: null,
  productCount: 0,
  visibleCount: 0,
  ...overrides,
});

const brands: BrandRow[] = [
  brand({ id: "b1", name: "Casa Icona", position: 0, productCount: 20, visibleCount: 12 }),
  brand({
    id: "b2",
    name: "Milonga",
    position: 1,
    productCount: 62,
    visibleCount: 40,
    coverUrl: "/media/brands/uploads/b2/c.webp",
  }),
  brand({ id: "b3", name: "Baobab", position: 2, isActive: false, productCount: 1 }),
  brand({
    id: "b4",
    name: "Otras marcas",
    position: 3,
    isFallback: true,
    productCount: 3,
    visibleCount: 1,
  }),
];

function actions() {
  return {
    setActive: vi.fn(ok),
    move: vi.fn(ok),
    saveCover: vi.fn(async (_id: string, _p: FormState, _d: FormData) => ok()),
    removeCover: vi.fn(ok),
  };
}

function renderView(acts = actions()) {
  render(<BrandsView brands={brands} actions={acts} />);
  return acts;
}

const row = (name: string) => within(screen.getByRole("row", { name: new RegExp(`^${name}\\b`) }));

describe("BrandsView", () => {
  it("is the Marcas tab of the web catalog", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Secciones del catálogo" });
    expect(within(nav).getByRole("link", { name: "Marcas" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    expect(within(nav).getByRole("link", { name: "Marcas" })).toHaveAttribute(
      "href",
      "/catalogo-web?tab=marcas",
    );
    expect(within(nav).getByRole("link", { name: "Prendas" })).toHaveAttribute(
      "href",
      "/catalogo-web",
    );
  });

  it("explains that an inactive brand is hidden from the whole web", () => {
    renderView();
    expect(screen.getByText(/se oculta de toda la web/i)).toBeInTheDocument();
  });

  it("lists each brand with its pieces and the ones on the web", () => {
    renderView();
    const cells = row("Milonga")
      .getAllByRole("cell")
      .map((cell) => cell.textContent);
    expect(cells).toContain("62");
    expect(cells).toContain("40");
    expect(screen.getAllByRole("row")).toHaveLength(brands.length + 1);
  });

  it("switches a brand on or off for the web", () => {
    const acts = renderView();
    const on = row("Casa Icona").getByRole("switch", { name: "Activa en la web: Casa Icona" });
    expect(on).toHaveAttribute("aria-checked", "true");
    fireEvent.click(on);
    expect(acts.setActive).toHaveBeenCalledWith("b1", false);
    const off = row("Baobab").getByRole("switch", { name: "Activa en la web: Baobab" });
    expect(off).toHaveAttribute("aria-checked", "false");
    fireEvent.click(off);
    expect(acts.setActive).toHaveBeenCalledWith("b3", true);
  });

  it("lets Otras marcas be switched but not moved", () => {
    renderView();
    const fallback = row("Otras marcas");
    expect(fallback.getByRole("switch", { name: "Activa en la web: Otras marcas" })).toBeVisible();
    expect(fallback.queryByRole("button", { name: /Subir|Bajar/ })).not.toBeInTheDocument();
  });

  it("moves brands up and down, disabled at the edges and before Otras marcas", () => {
    const acts = renderView();
    expect(row("Casa Icona").getByRole("button", { name: "Subir Casa Icona" })).toBeDisabled();
    expect(row("Baobab").getByRole("button", { name: "Bajar Baobab" })).toBeDisabled();
    fireEvent.click(row("Casa Icona").getByRole("button", { name: "Bajar Casa Icona" }));
    expect(acts.move).toHaveBeenCalledWith("b1", "down");
    fireEvent.click(row("Milonga").getByRole("button", { name: "Subir Milonga" }));
    expect(acts.move).toHaveBeenCalledWith("b2", "up");
  });

  it("offers a cover upload for every brand and removal only where there is one", () => {
    renderView();
    expect(row("Casa Icona").getByLabelText("Portada de Casa Icona")).toHaveAttribute(
      "type",
      "file",
    );
    expect(
      row("Casa Icona").queryByRole("button", { name: "Quitar portada de Casa Icona" }),
    ).not.toBeInTheDocument();
    expect(
      row("Milonga").getByRole("button", { name: "Quitar portada de Milonga" }),
    ).toBeInTheDocument();
  });

  it("removes the uploaded cover", async () => {
    const acts = renderView();
    fireEvent.click(row("Milonga").getByRole("button", { name: "Quitar portada de Milonga" }));
    await waitFor(() => expect(acts.removeCover).toHaveBeenCalledWith("b2"));
  });

  it("shows the refusal of an action next to the brand", async () => {
    const acts = actions();
    acts.setActive.mockResolvedValueOnce({ status: "error", message: "No se pudo guardar." });
    renderView(acts);
    fireEvent.click(row("Casa Icona").getByRole("switch", { name: /Activa en la web/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No se pudo guardar.");
  });
});
