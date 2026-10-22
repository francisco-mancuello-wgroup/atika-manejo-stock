import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { LotOption } from "../lib/queries/bank-promos";
import type { PickerProduct } from "../lib/queries/discounts";
import { BankPromoForm } from "./bank-promo-form";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push: vi.fn() }) }));

const idle = async (_previous?: FormState, _data?: FormData): Promise<FormState> => ({
  status: "idle",
});

const banks = [
  { id: "b1", name: "Itaú", logoUrl: "/media/banks/uploads/b1/a.webp" },
  { id: "b2", name: "Continental", logoUrl: null },
];
const lots: LotOption[] = [
  { id: "l1", name: "Lote verano", productCount: 12 },
  { id: "l2", name: "Lote invierno", productCount: 1 },
];
const products: PickerProduct[] = [
  {
    id: "p1",
    name: "Vestido Lino",
    lotId: "l1",
    lotName: "Lote verano",
    category: "vestidos",
    priceGs: 259_000,
    imageUrl: null,
  },
  {
    id: "p2",
    name: "Top Satén",
    lotId: "l1",
    lotName: "Lote verano",
    category: "tops",
    priceGs: 100_000,
    imageUrl: null,
  },
];

const renderForm = (props: Partial<Parameters<typeof BankPromoForm>[0]> = {}) =>
  render(<BankPromoForm banks={banks} lots={lots} products={products} action={idle} {...props} />);

const lotsGroup = () => screen.getByRole("group", { name: "Lotes de la promoción" });
const productsGroup = () => screen.getByRole("group", { name: "Productos de la promoción" });

describe("BankPromoForm", () => {
  it("starts with an active installments promo for every product and every day", () => {
    renderForm();
    expect(screen.getByLabelText("Tipo")).toHaveValue("installments");
    expect(screen.getByLabelText("Cuotas")).toHaveValue("");
    expect(screen.getByLabelText("Activa")).toBeChecked();
    expect(screen.getByLabelText("Todos los productos")).toBeChecked();
    for (const day of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) {
      expect(screen.getByLabelText(day)).not.toBeChecked();
    }
    expect(screen.queryByRole("group", { name: "Lotes de la promoción" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
  });

  it("labels the value as installments or percent depending on the kind", () => {
    renderForm();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "refund" } });
    expect(screen.getByLabelText("Porcentaje")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cuotas")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "installments" } });
    expect(screen.getByLabelText("Cuotas")).toBeInTheDocument();
  });

  it("shows the saved values when editing", () => {
    renderForm({
      initial: {
        kind: "refund",
        value: "20",
        capGs: "200000",
        startsAt: "2026-11-01",
        endsAt: "2026-11-30",
        terms: "Solo crédito.",
        isActive: false,
        scope: "lots",
        bankIds: ["b2"],
        days: [1, 4],
        lotIds: ["l2"],
        productIds: [],
      },
    });
    expect(screen.getByLabelText("Tipo")).toHaveValue("refund");
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("20");
    expect(screen.getByLabelText("Tope (₲)")).toHaveValue("200000");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
    expect(screen.getByLabelText("Bases y condiciones")).toHaveValue("Solo crédito.");
    expect(screen.getByLabelText("Activa")).not.toBeChecked();
    expect(screen.getByLabelText("Continental")).toBeChecked();
    expect(screen.getByLabelText("Itaú")).not.toBeChecked();
    expect(screen.getByLabelText("Lunes")).toBeChecked();
    expect(screen.getByLabelText("Jueves")).toBeChecked();
    expect(screen.getByLabelText("Martes")).not.toBeChecked();
    expect(screen.getByLabelText("Lotes")).toBeChecked();
    expect(within(lotsGroup()).getByLabelText(/Lote invierno/)).toBeChecked();
    expect(within(lotsGroup()).getByLabelText(/Lote verano/)).not.toBeChecked();
  });

  it("asks to create a bank first when there are none", () => {
    renderForm({ banks: [] });
    expect(screen.getByText("Primero cargá al menos un banco.")).toBeInTheDocument();
  });

  it("shows the lots checklist for 'Lotes' and the picker for 'Productos'", () => {
    renderForm();
    fireEvent.click(screen.getByLabelText("Lotes"));
    const row = (name: RegExp) =>
      within(lotsGroup()).getByLabelText(name).closest("label") as HTMLElement;
    expect(row(/Lote verano/)).toHaveTextContent("12 productos");
    expect(row(/Lote invierno/)).toHaveTextContent("1 producto");
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Productos"));
    expect(productsGroup()).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Lotes de la promoción" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByLabelText("Todos los productos"));
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
  });

  it("submits every field and the picked banks, days, lots and products", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.change(screen.getByLabelText("Tipo"), { target: { value: "refund" } });
    fireEvent.change(screen.getByLabelText("Porcentaje"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Tope (₲)"), { target: { value: "200.000" } });
    fireEvent.click(screen.getByLabelText("Itaú"));
    fireEvent.click(screen.getByLabelText("Continental"));
    fireEvent.click(screen.getByLabelText("Jueves"));
    fireEvent.click(screen.getByLabelText("Lunes"));
    fireEvent.click(screen.getByLabelText("Lotes"));
    fireEvent.click(within(lotsGroup()).getByLabelText(/Lote verano/));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as unknown as FormData;
    expect(data.get("kind")).toBe("refund");
    expect(data.get("value")).toBe("20");
    expect(data.get("capGs")).toBe("200.000");
    expect(data.get("scope")).toBe("lots");
    expect(data.get("isActive")).toBe("on");
    expect(data.getAll("bankIds")).toEqual(["b1", "b2"]);
    expect(data.getAll("days")).toEqual(["1", "4"]);
    expect(data.getAll("lotIds")).toEqual(["l1"]);
    expect(data.getAll("productIds")).toEqual([]);
  });

  it("submits the picked products for the 'Productos' scope", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.click(screen.getByLabelText("Productos"));
    fireEvent.click(within(productsGroup()).getByLabelText(/Vestido Lino/));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as unknown as FormData;
    expect(data.get("scope")).toBe("products");
    expect(data.getAll("productIds")).toEqual(["p1"]);
  });

  it("shows field errors and keeps what was typed", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: {
        value: "Las cuotas deben estar entre 2 y 48.",
        bankIds: "Elegí al menos un banco.",
        lotIds: "Elegí al menos un lote.",
      },
      values: { kind: "installments", value: "99", scope: "lots" },
    });
    renderForm({ action });
    fireEvent.click(screen.getByLabelText("Lotes"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Las cuotas deben estar entre 2 y 48.")).toBeInTheDocument();
    expect(screen.getByText("Elegí al menos un banco.")).toBeInTheDocument();
    expect(screen.getByText("Elegí al menos un lote.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuotas")).toHaveValue("99");
  });
});
