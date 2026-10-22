import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupDetail, GroupOptions } from "../lib/queries/catalog-groups";
import type { PickerProduct } from "../lib/queries/discounts";
import { GroupEditor, type GroupEditorActions } from "./group-editor";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const detail: GroupDetail = {
  id: "g2",
  name: "Liquidación",
  isActive: false,
  startsAt: "2026-11-01",
  endsAt: null,
  status: "Inactivo",
  products: [
    {
      id: "p1",
      name: "Vestido Lino",
      lotName: "Casa Icona",
      sizes: [
        { variantId: "v1", size: "S", stock: 10, free: 7, allocated: 4, sold: 1, remaining: 3 },
        { variantId: "v2", size: "M", stock: 4, free: 4, allocated: 0, sold: 0, remaining: 0 },
      ],
    },
  ],
  preview: { products: 1, units: 3 },
};

const options: GroupOptions = { lots: [{ id: "l1", name: "Lote Casa Icona" }], brands: ["Zara"] };

const pickerProducts: PickerProduct[] = [
  {
    id: "p1",
    name: "Vestido Lino",
    lotId: "l1",
    lotName: "Lote",
    category: null,
    priceGs: 1,
    imageUrl: null,
  },
  {
    id: "p9",
    name: "Top Seda",
    lotId: "l1",
    lotName: "Lote",
    category: null,
    priceGs: 1,
    imageUrl: null,
  },
];

function actions(overrides: Partial<GroupEditorActions> = {}): GroupEditorActions {
  return {
    saveGroup: vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok()),
    saveAllocations: vi.fn(ok),
    addProducts: vi.fn(ok),
    removeProduct: vi.fn(ok),
    deleteGroup: vi.fn(ok),
    ...overrides,
  };
}

function renderEditor(
  props: Partial<React.ComponentProps<typeof GroupEditor>> = {},
  acts = actions(),
) {
  render(
    <GroupEditor
      detail={detail}
      options={options}
      products={pickerProducts}
      actions={acts}
      backHref="/catalogo-web?tab=grupos"
      {...props}
    />,
  );
  return acts;
}

describe("GroupEditor", () => {
  it("creates a group from the name and window", async () => {
    const saveGroup = vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok());
    renderEditor({ detail: null }, actions({ saveGroup }));
    const panel = screen;
    expect(panel.queryByText("Agregar prendas")).not.toBeInTheDocument();
    fireEvent.change(panel.getByLabelText("Nombre"), { target: { value: "Otoño" } });
    fireEvent.change(panel.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.click(panel.getByRole("button", { name: "Crear grupo" }));
    await waitFor(() => expect(saveGroup).toHaveBeenCalled());
    expect(saveGroup.mock.calls[0]?.[0]).toBeNull();
    const data = saveGroup.mock.calls[0]?.[2] as FormData;
    expect(data.get("name")).toBe("Otoño");
    expect(data.get("startsAt")).toBe("2026-11-01");
  });

  it("shows field errors of the form", async () => {
    const saveGroup = vi.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: { name: "Escribí el nombre del grupo." },
      }),
    );
    renderEditor({ detail: null }, actions({ saveGroup }));
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));
    expect(await screen.findByText("Escribí el nombre del grupo.")).toBeInTheDocument();
  });

  it("lists the products with the stock figures of every size", () => {
    renderEditor();
    const panel = screen;
    expect(panel.getByLabelText("Nombre")).toHaveValue("Liquidación");
    expect(panel.getByLabelText("Desde")).toHaveValue("2026-11-01");
    const rows = panel.getAllByRole("row");
    const sizeS = within(rows.find((row) => within(row).queryByText("S")) as HTMLElement);
    expect(sizeS.getAllByRole("cell").map((cell) => cell.textContent || "input")).toEqual([
      "S",
      "10",
      "7",
      "input",
      "1",
      "3",
    ]);
    expect(panel.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle S" })).toHaveValue(
      4,
    );
    expect(panel.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle M" })).toHaveValue(
      0,
    );
  });

  it("previews what the web will show and updates it as quantities change", () => {
    renderEditor();
    expect(screen.getByText("La web va a mostrar 1 prendas / 3 unidades")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle M" }), {
      target: { value: "4" },
    });
    expect(screen.getByText("La web va a mostrar 1 prendas / 7 unidades")).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle S" }), {
      target: { value: "1" },
    });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle M" }), {
      target: { value: "0" },
    });
    expect(screen.getByText("La web va a mostrar 0 prendas / 0 unidades")).toBeInTheDocument();
  });

  it("saves every size quantity and shows the domain error inline", async () => {
    const saveAllocations = vi.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Vestido Lino, talle M: podés asignar hasta 4.",
      }),
    );
    renderEditor({}, actions({ saveAllocations }));
    fireEvent.change(screen.getByRole("spinbutton", { name: "Asignado: Vestido Lino, talle M" }), {
      target: { value: "9" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar cantidades" }));
    await waitFor(() =>
      expect(saveAllocations).toHaveBeenCalledWith("g2", [
        { variantId: "v1", allocated: 4 },
        { variantId: "v2", allocated: 9 },
      ]),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent("podés asignar hasta 4");
  });

  it("removes a product from the group", async () => {
    const removeProduct = vi.fn(ok);
    renderEditor({}, actions({ removeProduct }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar: Vestido Lino" }));
    await waitFor(() => expect(removeProduct).toHaveBeenCalledWith("g2", "p1"));
  });

  it("adds by lote, catálogo, categoría or marca", async () => {
    const addProducts = vi.fn(ok);
    renderEditor({}, actions({ addProducts }));
    const bulk = within(screen.getByRole("group", { name: "Agregar por" }));
    fireEvent.change(bulk.getByLabelText("Criterio"), { target: { value: "lote" } });
    fireEvent.change(bulk.getByLabelText("Valor"), { target: { value: "l1" } });
    fireEvent.click(bulk.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(addProducts).toHaveBeenCalledWith("g2", { lotId: "l1" }));
    fireEvent.change(bulk.getByLabelText("Criterio"), { target: { value: "marca" } });
    fireEvent.change(bulk.getByLabelText("Valor"), { target: { value: "Zara" } });
    fireEvent.click(bulk.getByRole("button", { name: "Agregar" }));
    await waitFor(() => expect(addProducts).toHaveBeenLastCalledWith("g2", { brand: "Zara" }));
    fireEvent.change(bulk.getByLabelText("Criterio"), { target: { value: "catalogo" } });
    expect(
      within(bulk.getByLabelText("Valor"))
        .getAllByRole("option")
        .map((o) => o.textContent),
    ).toEqual(["Elegí…", "Casa Icona", "Milonga", "Sordo"]);
  });

  it("searches a single product and adds it, hiding the ones already in the group", async () => {
    const addProducts = vi.fn(ok);
    renderEditor({}, actions({ addProducts }));
    fireEvent.change(screen.getByRole("searchbox", { name: "Buscar prenda" }), {
      target: { value: "s" },
    });
    expect(screen.queryByRole("button", { name: "Agregar: Vestido Lino" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Agregar: Top Seda" }));
    await waitFor(() => expect(addProducts).toHaveBeenCalledWith("g2", { productIds: ["p9"] }));
  });

  it("deletes an inactive group after confirming, and explains why an active one can't", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteGroup = vi.fn(ok);
    renderEditor({}, actions({ deleteGroup }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Liquidación" }));
    expect(confirm).toHaveBeenCalled();
    expect(deleteGroup).toHaveBeenCalledWith("g2");
    confirm.mockRestore();
  });

  it("hides delete for an active group", () => {
    renderEditor({ detail: { ...detail, isActive: true, status: "Activo" } });
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.getByText("Desactivá el grupo para poder eliminarlo.")).toBeInTheDocument();
  });
});

describe("GroupEditor on its own page", () => {
  it("has no side panel nor close link", () => {
    renderEditor();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Cerrar" })).not.toBeInTheDocument();
  });

  it("goes back to the groups tab after deleting", async () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    renderEditor();
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Liquidación" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/catalogo-web?tab=grupos"));
    confirm.mockRestore();
  });
});
