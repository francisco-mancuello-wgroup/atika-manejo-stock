import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { PickerProduct } from "../lib/queries/discounts";
import { DiscountForm } from "./discount-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const idle = async (_previous?: FormState, _data?: FormData): Promise<FormState> => ({
  status: "idle",
});

const product = (
  id: string,
  name: string,
  lotId: string,
  category: string | null,
  priceGs = 100_000,
): PickerProduct => ({
  id,
  name,
  lotId,
  lotName: `Lote ${lotId}`,
  category,
  priceGs,
  imageUrl: null,
});
const products = [
  product("p1", "Vestido Lino", "l1", "vestidos", 259_000),
  product("p2", "Top Satén", "l1", "tops"),
  product("p3", "Vestido Seda", "l2", "vestidos"),
  product("p4", "Aros Sordo", "l2", "accesorios"),
];

const renderForm = (props: Partial<Parameters<typeof DiscountForm>[0]> = {}) =>
  render(<DiscountForm products={products} action={idle} {...props} />);

const picker = () => screen.getByRole("group", { name: "Productos del descuento" });

describe("DiscountForm", () => {
  it("starts with an active discount for every product and no picker", () => {
    renderForm();
    expect(screen.getByLabelText("Nombre")).toHaveValue("");
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("");
    expect(screen.getByLabelText("Activo")).toBeChecked();
    expect(screen.getByLabelText("Todos los productos")).toBeChecked();
    expect(
      screen.queryByRole("group", { name: "Productos del descuento" }),
    ).not.toBeInTheDocument();
  });

  it("shows the saved values when editing", () => {
    renderForm({
      initial: {
        name: "Verano",
        percent: "25",
        isActive: false,
        startsAt: "2026-11-01",
        endsAt: "2026-11-30",
        scope: "selected",
        productIds: ["p2", "p3"],
      },
    });
    expect(screen.getByLabelText("Nombre")).toHaveValue("Verano");
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("25");
    expect(screen.getByLabelText("Activo")).not.toBeChecked();
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
    expect(screen.getByLabelText("Seleccionar productos")).toBeChecked();
    expect(within(picker()).getByLabelText(/Top Satén/)).toBeChecked();
    expect(within(picker()).getByLabelText(/Vestido Lino/)).not.toBeChecked();
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();
  });

  it("shows the picker only for the selected scope", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    expect(picker()).toBeInTheDocument();
    expect(screen.getByText("0 seleccionados")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Todos los productos"));
    expect(
      screen.queryByRole("group", { name: "Productos del descuento" }),
    ).not.toBeInTheDocument();
  });

  it("lists each product with its lot and price, and counts the selection", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    const row = within(picker())
      .getByLabelText(/Vestido Lino/)
      .closest("label") as HTMLElement;
    expect(row).toHaveTextContent("Lote l1");
    expect(row).toHaveTextContent("₲ 259.000");
    fireEvent.click(within(picker()).getByLabelText(/Vestido Lino/));
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
  });

  it("filters by search, lot and category", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    const names = () =>
      within(picker()).getAllByRole("checkbox", { name: /^(?!Seleccionar todos)/ }).length;

    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "vestido" } });
    expect(names()).toBe(2);
    fireEvent.change(screen.getByLabelText("Lote"), { target: { value: "l2" } });
    expect(names()).toBe(1);
    expect(within(picker()).getByLabelText(/Vestido Seda/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Lote"), { target: { value: "" } });
    fireEvent.change(screen.getByLabelText("Categoría"), { target: { value: "tops" } });
    expect(names()).toBe(1);
    expect(within(picker()).getByLabelText(/Top Satén/)).toBeInTheDocument();
  });

  it("selects and clears every filtered product, keeping the rest of the selection", () => {
    renderForm({
      initial: {
        name: "",
        percent: "",
        isActive: true,
        startsAt: "",
        endsAt: "",
        scope: "selected",
        productIds: ["p4"],
      },
    });
    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "vestido" } });
    fireEvent.click(screen.getByLabelText("Seleccionar todos los filtrados"));
    expect(screen.getByText("3 seleccionados")).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Seleccionar todos los filtrados"));
    expect(screen.getByText("1 seleccionado")).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "" } });
    expect(within(picker()).getByLabelText(/Aros Sordo/)).toBeChecked();
  });

  it("explains when no product matches the filters", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    fireEvent.change(screen.getByLabelText("Buscar producto"), { target: { value: "zzz" } });
    expect(screen.getByText("No hay productos que coincidan.")).toBeInTheDocument();
  });

  it("submits the picked product ids with the form", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.change(screen.getByLabelText("Nombre"), { target: { value: "Verano" } });
    fireEvent.change(screen.getByLabelText("Porcentaje"), { target: { value: "20" } });
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    fireEvent.click(within(picker()).getByLabelText(/Vestido Lino/));
    fireEvent.click(within(picker()).getByLabelText(/Aros Sordo/));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as unknown as FormData;
    expect(data.get("name")).toBe("Verano");
    expect(data.get("percent")).toBe("20");
    expect(data.get("scope")).toBe("selected");
    expect(data.get("isActive")).toBe("on");
    expect(data.getAll("productIds")).toEqual(["p1", "p4"]);
  });

  it("shows field errors, including the product list", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: {
        percent: "El porcentaje no puede superar 90.",
        productIds: "Elegí al menos un producto.",
      },
      values: { name: "Verano", percent: "95", scope: "selected" },
    });
    renderForm({ action });
    fireEvent.click(screen.getByLabelText("Seleccionar productos"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("El porcentaje no puede superar 90.")).toBeInTheDocument();
    expect(screen.getByText("Elegí al menos un producto.")).toBeInTheDocument();
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("95");
  });
});
