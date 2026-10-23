import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { ProductFilter } from "../lib/catalog-groups/groups";
import type { Proposal } from "../lib/catalog-groups/stock";
import type { GroupCandidate, GroupOptions } from "../lib/queries/catalog-groups";
import { GroupAddModal } from "./group-add-modal";

const ok = async (): Promise<FormState> => ({ status: "success", message: "ok" });

const options: GroupOptions = {
  lots: [{ id: "l1", name: "Lote Pink" }],
  brands: [
    { slug: "zara", name: "Zara" },
    { slug: "otras-marcas", name: "Otras marcas" },
  ],
};

const candidate = (
  id: string,
  sizes: [string, number][],
  extra: Partial<GroupCandidate> = {},
): GroupCandidate => ({
  id,
  name: `Prenda ${id}`,
  lotName: "Lote Pink",
  imageUrl: null,
  inGroup: false,
  sizes: sizes.map(([size, free]) => ({ size, free })),
  ...extra,
});

const candidates = [
  candidate("a", [
    ["S", 3],
    ["M", 1],
    ["L", 1],
  ]),
  candidate("b", [["U", 2]]),
  candidate("c", [["S", 0]]),
  candidate("d", [["S", 4]], { inGroup: true }),
];

type Add = (groupId: string, filter: ProductFilter, proposal: Proposal) => Promise<FormState>;

function setup(overrides: { addProducts?: Add; onClose?: () => void } = {}) {
  const listCandidates = vi.fn(async () => candidates);
  const addProducts = vi.fn(overrides.addProducts ?? ok);
  const onClose = overrides.onClose ?? vi.fn();
  render(
    <GroupAddModal
      groupId="g1"
      groupName="Pink"
      options={options}
      listCandidates={listCandidates}
      addProducts={addProducts}
      onClose={onClose}
    />,
  );
  return { listCandidates, addProducts, onClose };
}

async function pickLot() {
  fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "l1" } });
  await screen.findByText("Prenda a");
}

describe("GroupAddModal", () => {
  it("is a dialog titled with the group", () => {
    setup();
    expect(screen.getByRole("dialog", { name: "Agregar prendas a Pink" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Marca", selected: true })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Catálogo" })).not.toBeInTheDocument();
    for (const name of ["Categoría", "Marca de la prenda"]) {
      expect(screen.getByRole("tab", { name })).toBeInTheDocument();
    }
  });

  it("loads the candidates of the chosen value and shows the free stock per size", async () => {
    const { listCandidates } = setup();
    await pickLot();
    expect(listCandidates).toHaveBeenCalledWith("g1", { lotId: "l1" });
    expect(screen.getByText("S 3 · M 1 · L 1")).toBeInTheDocument();
  });

  it("changes the filter with the criterion", async () => {
    const { listCandidates } = setup();
    fireEvent.click(screen.getByRole("tab", { name: "Marca de la prenda" }));
    expect(screen.getByRole("option", { name: "Otras marcas" })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Valor"), { target: { value: "zara" } });
    await waitFor(() => expect(listCandidates).toHaveBeenCalledWith("g1", { brand: "zara" }));
  });

  it("disables products already in the group and those without free stock", async () => {
    setup();
    await pickLot();
    const check = (name: string) =>
      screen.getByRole("checkbox", { name: `Seleccionar ${name}` }) as HTMLInputElement;
    expect(check("Prenda a")).toBeEnabled();
    expect(check("Prenda c")).toBeDisabled();
    expect(check("Prenda d")).toBeDisabled();
    expect(screen.getByText("Sin stock libre")).toBeInTheDocument();
    expect(screen.getByText("Ya está en Pink")).toBeInTheDocument();
  });

  it("starts with nothing selected, with a header checkbox and its count", async () => {
    setup();
    await pickLot();
    const header = screen.getByRole("checkbox", { name: "Seleccionar las 2" }) as HTMLInputElement;
    expect(header).not.toBeChecked();
    expect(header.indeterminate).toBe(false);
    expect(screen.getByRole("checkbox", { name: "Seleccionar Prenda a" })).not.toBeChecked();
    expect(screen.getByRole("button", { name: /Agregar 0 prendas/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Prenda b" }));
    expect(header).not.toBeChecked();
    expect(header.indeterminate).toBe(true);
    fireEvent.click(header);
    expect(screen.getByRole("checkbox", { name: "Seleccionar Prenda a" })).toBeChecked();
    expect(screen.getByRole("checkbox", { name: "Seleccionar Prenda b" })).toBeChecked();
    fireEvent.click(header);
    expect(screen.getByRole("checkbox", { name: "Seleccionar Prenda a" })).not.toBeChecked();
  });

  it("counts the products and units of each proposal", async () => {
    setup();
    await pickLot();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar las 2" }));
    expect(screen.getByRole("button", { name: "Agregar 2 prendas · 7 unidades" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Proponer"), { target: { value: "one" } });
    expect(screen.getByRole("button", { name: "Agregar 2 prendas · 4 unidades" })).toBeEnabled();
    fireEvent.change(screen.getByLabelText("Proponer"), { target: { value: "zero" } });
    expect(screen.getByRole("button", { name: "Agregar 2 prendas · 0 unidades" })).toBeEnabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Prenda b" }));
    expect(screen.getByRole("button", { name: "Agregar 1 prenda · 0 unidades" })).toBeEnabled();
  });

  it("adds the selected products with the proposal and closes", async () => {
    const { addProducts, onClose } = setup();
    await pickLot();
    fireEvent.change(screen.getByLabelText("Proponer"), { target: { value: "one" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar Prenda a" }));
    fireEvent.click(screen.getByRole("button", { name: /Agregar 1 prenda/ }));
    await waitFor(() =>
      expect(addProducts).toHaveBeenCalledWith("g1", { productIds: ["a"] }, "one"),
    );
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });

  it("stays open and shows the refusal", async () => {
    const onClose = vi.fn();
    setup({
      onClose,
      addProducts: vi.fn(
        async (): Promise<FormState> => ({ status: "error", message: "No hay stock libre." }),
      ),
    });
    await pickLot();
    fireEvent.click(screen.getByRole("checkbox", { name: "Seleccionar las 2" }));
    fireEvent.click(screen.getByRole("button", { name: /Agregar 2 prendas/ }));
    expect(await screen.findByRole("alert")).toHaveTextContent("No hay stock libre.");
    expect(onClose).not.toHaveBeenCalled();
  });

  it("offers nothing to add before a value is chosen, and closes with Escape", () => {
    const { onClose } = setup();
    expect(screen.getByRole("button", { name: /Agregar 0 prendas/ })).toBeDisabled();
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalled();
    expect(
      within(screen.getByRole("dialog")).getByRole("button", { name: "Cerrar" }),
    ).toBeInTheDocument();
  });
});
