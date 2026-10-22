import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupDetail } from "../lib/queries/catalog-groups";
import type { GroupActions } from "./group-actions";
import { GroupWorkspace } from "./group-workspace";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const size = (
  variantId: string,
  label: string,
  stock: number,
  free: number,
  allocated: number,
  sold: number,
  max: number,
) => ({
  variantId,
  size: label,
  stock,
  free,
  allocated,
  sold,
  remaining: Math.min(Math.max(0, allocated - sold), stock),
  max,
});

const detail: GroupDetail = {
  id: "g1",
  name: "Pink",
  isActive: false,
  startsAt: null,
  endsAt: null,
  status: "Inactivo",
  products: [
    {
      id: "p1",
      name: "COSTA BLANCO",
      lotName: "Lote Pink",
      imageUrl: null,
      sizes: [size("v1", "S", 5, 2, 3, 1, 5), size("v2", "M", 4, 0, 4, 0, 4)],
    },
    {
      id: "p2",
      name: "Remera Ñandú",
      lotName: "Lote Pink",
      imageUrl: null,
      sizes: [size("v3", "XS", 3, 3, 0, 0, 3), size("v4", "XL", 2, 0, 2, 2, 2)],
    },
  ],
  preview: { products: 1, units: 6 },
};

function actions(overrides: Partial<GroupActions> = {}): GroupActions {
  return {
    saveGroup: vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok()),
    saveAllocations: vi.fn(ok),
    addProducts: vi.fn(ok),
    listCandidates: vi.fn(async () => []),
    removeProduct: vi.fn(ok),
    deleteGroup: vi.fn(ok),
    setActive: vi.fn(ok),
    ...overrides,
  };
}

function renderWorkspace(overrides: Partial<GroupActions> = {}, group: GroupDetail = detail) {
  const a = actions(overrides);
  render(<GroupWorkspace detail={group} options={{ lots: [], brands: [] }} actions={a} />);
  return a;
}

const input = (name: string, sizeLabel: string) =>
  screen.getByLabelText(`Asignado: ${name}, talle ${sizeLabel}`) as HTMLInputElement;

describe("GroupWorkspace", () => {
  it("shows the KPIs of the saved data", () => {
    renderWorkspace();
    const kpi = (label: string) => screen.getByText(label).parentElement as HTMLElement;
    expect(within(kpi("PRENDAS")).getByText("2")).toBeInTheDocument();
    expect(within(kpi("PRENDAS")).getByText("4 talles")).toBeInTheDocument();
    expect(within(kpi("ASIGNADAS")).getByText("9")).toBeInTheDocument();
    expect(within(kpi("VENDIDAS")).getByText("3")).toBeInTheDocument();
    expect(within(kpi("VENDIDAS")).getByText("desde que se activó")).toBeInTheDocument();
    expect(within(kpi("LA WEB VE")).getByText("6")).toBeInTheDocument();
  });

  it("draws a column per size in canonical order and a dash where a product lacks it", () => {
    renderWorkspace();
    const headers = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(headers).toEqual(["PRENDA", "XS", "S", "M", "XL", "WEB", ""]);
    const row = screen.getByText("COSTA BLANCO").closest("tr") as HTMLElement;
    expect(within(row).getAllByText("—")).toHaveLength(2);
  });

  it("hints the limit, the sold and free units, and sold out sizes", () => {
    renderWorkspace();
    expect(screen.getByText("de 4")).toBeInTheDocument();
    expect(screen.getByText("1 vend. · 2 lib.")).toBeInTheDocument();
    expect(screen.getByText("agotado")).toBeInTheDocument();
    expect(input("Remera Ñandú", "XL")).toHaveClass("bg-warnbg");
  });

  it("shows the web total of each row and the shown count", () => {
    renderWorkspace();
    const row = screen.getByText("COSTA BLANCO").closest("tr") as HTMLElement;
    expect(within(row).getByText("6")).toBeInTheDocument();
    expect(screen.getByText("Mostrando 2 de 2 prendas")).toBeInTheDocument();
    expect(screen.getByText("Enter pasa al talle siguiente")).toBeInTheDocument();
  });

  describe("unsaved changes", () => {
    it("has no bar until a quantity changes", () => {
      renderWorkspace();
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    });

    it("shows the bar with the first change, marks the input and updates the web total", () => {
      renderWorkspace();
      fireEvent.change(input("COSTA BLANCO", "S"), { target: { value: "2" } });
      expect(screen.getByText(/1 cambio sin guardar/)).toBeInTheDocument();
      expect(screen.getByText(/COSTA BLANCO S: 3 → 2/)).toBeInTheDocument();
      expect(input("COSTA BLANCO", "S")).toHaveClass("border-2");
      const row = screen.getByText("COSTA BLANCO").closest("tr") as HTMLElement;
      expect(within(row).getByText("5")).toBeInTheDocument();
      fireEvent.change(input("COSTA BLANCO", "M"), { target: { value: "3" } });
      expect(screen.getByText(/2 cambios sin guardar/)).toBeInTheDocument();
    });

    it("discards back to the saved values", () => {
      renderWorkspace();
      fireEvent.change(input("COSTA BLANCO", "S"), { target: { value: "2" } });
      fireEvent.click(screen.getByRole("button", { name: "Descartar" }));
      expect(input("COSTA BLANCO", "S")).toHaveValue(3);
      expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument();
    });

    it("saves only the changed sizes and clears the bar", async () => {
      const a = renderWorkspace();
      fireEvent.change(input("COSTA BLANCO", "S"), { target: { value: "2" } });
      fireEvent.change(input("Remera Ñandú", "XS"), { target: { value: "3" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      await waitFor(() =>
        expect(a.saveAllocations).toHaveBeenCalledWith("g1", [
          { variantId: "v1", allocated: 2 },
          { variantId: "v3", allocated: 3 },
        ]),
      );
      await waitFor(() =>
        expect(screen.queryByRole("button", { name: "Guardar cambios" })).not.toBeInTheDocument(),
      );
      expect(input("COSTA BLANCO", "S")).toHaveValue(2);
    });

    it("keeps the changes and shows the refusal when the save fails", async () => {
      renderWorkspace({
        saveAllocations: vi.fn(
          async (): Promise<FormState> => ({
            status: "error",
            message: "COSTA BLANCO, talle S: podés asignar hasta 5.",
          }),
        ),
      });
      fireEvent.change(input("COSTA BLANCO", "S"), { target: { value: "9" } });
      fireEvent.click(screen.getByRole("button", { name: "Guardar cambios" }));
      expect(await screen.findByRole("alert")).toHaveTextContent("podés asignar hasta 5");
      expect(screen.getByRole("button", { name: "Guardar cambios" })).toBeInTheDocument();
    });

    it("warns before leaving the page", () => {
      renderWorkspace();
      const clean = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(clean);
      expect(clean.defaultPrevented).toBe(false);
      fireEvent.change(input("COSTA BLANCO", "S"), { target: { value: "2" } });
      const dirty = new Event("beforeunload", { cancelable: true });
      window.dispatchEvent(dirty);
      expect(dirty.defaultPrevented).toBe(true);
    });
  });

  it("moves to the next size input with Enter", () => {
    renderWorkspace();
    input("Remera Ñandú", "XS").focus();
    fireEvent.keyDown(input("Remera Ñandú", "XS"), { key: "Enter" });
    expect(input("Remera Ñandú", "XL")).toHaveFocus();
  });

  describe("search and filters", () => {
    it("searches by name ignoring case and accents", () => {
      renderWorkspace();
      fireEvent.change(screen.getByRole("searchbox", { name: "Buscar en el grupo" }), {
        target: { value: "nandu" },
      });
      expect(screen.queryByText("COSTA BLANCO")).not.toBeInTheDocument();
      expect(screen.getByText("Remera Ñandú")).toBeInTheDocument();
      expect(screen.getByText("Mostrando 1 de 2 prendas")).toBeInTheDocument();
    });

    it("filters by free stock and by sold out on the web", () => {
      renderWorkspace();
      expect(screen.getByRole("button", { name: "Todas · 2" })).toBeInTheDocument();
      fireEvent.click(screen.getByRole("button", { name: "Con stock libre" }));
      expect(screen.getAllByRole("row")).toHaveLength(1 + 2);
      // The web sees nothing of the Ñandú (nothing assigned to XS, XL sold out).
      fireEvent.click(screen.getByRole("button", { name: "Agotadas en web · 1" }));
      expect(screen.getByText("Remera Ñandú")).toBeInTheDocument();
      expect(screen.queryByText("COSTA BLANCO")).not.toBeInTheDocument();
    });
  });

  it("assigns all the free stock as unsaved changes", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Asignar todo el libre" }));
    expect(input("COSTA BLANCO", "S")).toHaveValue(5);
    expect(input("Remera Ñandú", "XS")).toHaveValue(3);
    expect(input("Remera Ñandú", "XL")).toHaveValue(2);
    expect(screen.getByText(/2 cambios sin guardar/)).toBeInTheDocument();
  });

  it("opens the add products dialog and closes it", () => {
    renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Agregar prendas" }));
    expect(screen.getByRole("dialog", { name: "Agregar prendas a Pink" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Cerrar" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("removes a product from the group", async () => {
    const a = renderWorkspace();
    fireEvent.click(screen.getByRole("button", { name: "Quitar COSTA BLANCO" }));
    await waitFor(() => expect(a.removeProduct).toHaveBeenCalledWith("g1", "p1"));
  });

  it("says so when the group has no products", () => {
    renderWorkspace({}, { ...detail, products: [] });
    expect(screen.getByText("Todavía no agregaste prendas.")).toBeInTheDocument();
  });
});
