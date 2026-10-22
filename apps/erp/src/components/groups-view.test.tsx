import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { GroupDetail, GroupOptions, GroupSummary } from "../lib/queries/catalog-groups";
import type { PickerProduct } from "../lib/queries/discounts";
import { GroupsView, type GroupsViewActions } from "./groups-view";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const groups: GroupSummary[] = [
  {
    id: "g1",
    name: "Verano",
    isActive: true,
    startsAt: "2026-10-01",
    endsAt: "2026-10-31",
    status: "Activo",
    productCount: 2,
    allocated: 18,
    sold: 5,
    remaining: 13,
  },
  {
    id: "g2",
    name: "Liquidación",
    isActive: false,
    startsAt: null,
    endsAt: null,
    status: "Inactivo",
    productCount: 0,
    allocated: 0,
    sold: 0,
    remaining: 0,
  },
];

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

function actions(overrides: Partial<GroupsViewActions> = {}): GroupsViewActions {
  return {
    saveGroup: vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok()),
    setActive: vi.fn(ok),
    saveAllocations: vi.fn(ok),
    addProducts: vi.fn(ok),
    removeProduct: vi.fn(ok),
    deleteGroup: vi.fn(ok),
    ...overrides,
  };
}

function renderView(
  props: Partial<React.ComponentProps<typeof GroupsView>> = {},
  acts = actions(),
) {
  render(
    <GroupsView
      groups={groups}
      selection={{ tab: "grupos", groupId: null, isNew: false }}
      detail={null}
      options={options}
      products={pickerProducts}
      actions={acts}
      {...props}
    />,
  );
  return acts;
}

const editing = { selection: { tab: "grupos" as const, groupId: "g2", isNew: false }, detail };

describe("GroupsView table", () => {
  it("has the two tabs with Grupos current", () => {
    renderView();
    const nav = screen.getByRole("navigation", { name: "Secciones del catálogo" });
    expect(within(nav).getByRole("link", { name: "Prendas" })).toHaveAttribute(
      "href",
      "/catalogo-web",
    );
    expect(within(nav).getByRole("link", { name: "Grupos" })).toHaveAttribute(
      "aria-current",
      "page",
    );
  });

  it("lists each group with counts, window, status and a switch", () => {
    renderView();
    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    const first = within(rows[0] as HTMLElement);
    expect(first.getByRole("link", { name: "Verano" })).toHaveAttribute(
      "href",
      "/catalogo-web?tab=grupos&grupo=g1",
    );
    expect(first.getByText("Activo", { selector: "span" })).toBeInTheDocument();
    expect(first.getByText("2026-10-01 – 2026-10-31")).toBeInTheDocument();
    expect(
      within(rows[0] as HTMLElement)
        .getAllByRole("cell")
        .map((cell) => cell.textContent)
        .slice(1, 5),
    ).toEqual(["2", "18", "5", "13"]);
    expect(first.getByRole("switch", { name: "Activo: Verano" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
    const second = within(rows[1] as HTMLElement);
    expect(second.getByText("Sin fecha")).toBeInTheDocument();
    expect(second.getByRole("switch", { name: "Activo: Liquidación" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
  });

  it("explains the empty state and links to the new group editor", () => {
    renderView({ groups: [] });
    expect(screen.getByText(/Todavía no hay grupos/)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Nuevo grupo" })).toHaveAttribute(
      "href",
      "/catalogo-web?tab=grupos&grupo=nuevo",
    );
  });

  it("activates through the switch and shows the refusal from the domain", async () => {
    const setActive = vi.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Vestido, talle S ya está en el grupo activo «Verano».",
      }),
    );
    renderView({}, actions({ setActive }));
    fireEvent.click(screen.getByRole("switch", { name: "Activo: Liquidación" }));
    expect(setActive).toHaveBeenCalledWith("g2", true);
    expect(await screen.findByRole("alert")).toHaveTextContent("ya está en el grupo activo");
  });
});

describe("GroupEditor", () => {
  it("shows nothing but the table when no group is selected", () => {
    renderView();
    expect(screen.queryByRole("complementary")).not.toBeInTheDocument();
  });

  it("creates a group from the name and window", async () => {
    const saveGroup = vi.fn(async (_id: string | null, _p: FormState, _d: FormData) => ok());
    renderView(
      { selection: { tab: "grupos", groupId: null, isNew: true } },
      actions({ saveGroup }),
    );
    const panel = within(screen.getByRole("complementary", { name: "Editor de grupo" }));
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
    renderView(
      { selection: { tab: "grupos", groupId: null, isNew: true } },
      actions({ saveGroup }),
    );
    fireEvent.click(screen.getByRole("button", { name: "Crear grupo" }));
    expect(await screen.findByText("Escribí el nombre del grupo.")).toBeInTheDocument();
  });

  it("lists the products with the stock figures of every size", () => {
    renderView(editing);
    const panel = within(screen.getByRole("complementary", { name: "Editor de grupo" }));
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
    renderView(editing);
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
    renderView(editing, actions({ saveAllocations }));
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
    renderView(editing, actions({ removeProduct }));
    fireEvent.click(screen.getByRole("button", { name: "Quitar: Vestido Lino" }));
    await waitFor(() => expect(removeProduct).toHaveBeenCalledWith("g2", "p1"));
  });

  it("adds by lote, catálogo, categoría or marca", async () => {
    const addProducts = vi.fn(ok);
    renderView(editing, actions({ addProducts }));
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
    renderView(editing, actions({ addProducts }));
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
    renderView(editing, actions({ deleteGroup }));
    fireEvent.click(screen.getByRole("button", { name: "Eliminar: Liquidación" }));
    expect(confirm).toHaveBeenCalled();
    expect(deleteGroup).toHaveBeenCalledWith("g2");
    confirm.mockRestore();
  });

  it("hides delete for an active group", () => {
    renderView({
      selection: { tab: "grupos", groupId: "g2", isNew: false },
      detail: { ...detail, isActive: true, status: "Activo" },
    });
    expect(screen.queryByRole("button", { name: /Eliminar/ })).not.toBeInTheDocument();
    expect(screen.getByText("Desactivá el grupo para poder eliminarlo.")).toBeInTheDocument();
  });
});
