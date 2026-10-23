import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import type { LotOption } from "../lib/queries/bank-promos";
import type { PickerProduct } from "../lib/queries/discounts";
import { BankPromoForm } from "./bank-promo-form";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: vi.fn(), push }) }));

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
  render(
    <BankPromoForm
      promoId={null}
      savedHeadline={null}
      banks={banks}
      lots={lots}
      products={products}
      action={idle}
      {...props}
    />,
  );

const lotsGroup = () => screen.getByRole("group", { name: "Marcas de la promoción" });
const productsGroup = () => screen.getByRole("group", { name: "Productos de la promoción" });
const preview = () => screen.getByRole("region", { name: "Así lo ve el cliente" });
const pressed = (name: string) => screen.getByRole("button", { name });

const EMPTY_PREVIEW = "Completá el beneficio y elegí al menos un banco para ver la vista previa.";

describe("BankPromoForm", () => {
  it("opens a new promo: installments for every product and every day, nothing pressed", () => {
    renderForm();
    expect(screen.getByText("Nueva promoción", { selector: "p" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: "Nueva promoción" })).toBeInTheDocument();
    expect(pressed("Cuotas")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Reintegro")).toHaveAttribute("aria-pressed", "false");
    expect(pressed("Todos los productos")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("switch", { name: "Activa" })).toBeChecked();
    for (const day of ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]) {
      expect(pressed(day)).toHaveAttribute("aria-pressed", "false");
    }
    expect(screen.queryByRole("group", { name: "Marcas de la promoción" })).not.toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Eliminar/ })).not.toBeInTheDocument();
  });

  it("titles an existing promo with its saved headline and offers to delete it", () => {
    renderForm({
      promoId: "p9",
      savedHeadline: "20 % de reintegro",
      remove: { action: vi.fn(idle as never), redirectTo: "/promos/bancos" },
    });
    expect(screen.getByText("Editar promoción", { selector: "p" })).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 2, name: "20 % de reintegro" }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Eliminar: 20 % de reintegro" })).toBeInTheDocument();
  });

  it("labels the value as installments or percent depending on the kind", () => {
    renderForm();
    fireEvent.click(pressed("Reintegro"));
    expect(pressed("Reintegro")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Cuotas")).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByLabelText("Porcentaje")).toBeInTheDocument();
    expect(screen.queryByLabelText("Cuotas")).not.toBeInTheDocument();
    fireEvent.click(pressed("Cuotas"));
    expect(screen.getByLabelText("Cuotas")).toBeInTheDocument();
  });

  it("shows the saved values when editing", () => {
    renderForm({
      promoId: "p9",
      savedHeadline: "20 % de reintegro",
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
    expect(pressed("Reintegro")).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Porcentaje")).toHaveValue("20");
    expect(screen.getByLabelText("Tope (₲)")).toHaveValue("200000");
    expect(screen.getByLabelText("Desde")).toHaveValue("2026-11-01");
    expect(screen.getByLabelText("Hasta")).toHaveValue("2026-11-30");
    expect(screen.getByLabelText("Bases y condiciones")).toHaveValue("Solo crédito.");
    expect(screen.getByRole("switch", { name: "Activa" })).not.toBeChecked();
    expect(pressed("Continental")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Itaú")).toHaveAttribute("aria-pressed", "false");
    expect(pressed("Lunes")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Jueves")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Martes")).toHaveAttribute("aria-pressed", "false");
    expect(pressed("Marcas")).toHaveAttribute("aria-pressed", "true");
    expect(within(lotsGroup()).getByLabelText(/Lote invierno/)).toBeChecked();
    expect(within(lotsGroup()).getByLabelText(/Lote verano/)).not.toBeChecked();
  });

  it("asks to create a bank first when there are none", () => {
    renderForm({ banks: [] });
    expect(screen.getByText("Primero cargá al menos un banco.")).toBeInTheDocument();
  });

  it("shows the lots checklist for 'Marcas' and the picker for 'Productos'", () => {
    renderForm();
    fireEvent.click(pressed("Marcas"));
    const row = (name: RegExp) =>
      within(lotsGroup()).getByLabelText(name).closest("label") as HTMLElement;
    expect(row(/Lote verano/)).toHaveTextContent("12 productos");
    expect(row(/Lote invierno/)).toHaveTextContent("1 producto");
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
    fireEvent.click(pressed("Productos"));
    expect(productsGroup()).toBeInTheDocument();
    expect(screen.queryByRole("group", { name: "Marcas de la promoción" })).not.toBeInTheDocument();
    fireEvent.click(pressed("Todos los productos"));
    expect(
      screen.queryByRole("group", { name: "Productos de la promoción" }),
    ).not.toBeInTheDocument();
  });

  it("toggles banks and weekdays as pressed buttons", () => {
    renderForm();
    fireEvent.click(pressed("Itaú"));
    expect(pressed("Itaú")).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(pressed("Itaú"));
    expect(pressed("Itaú")).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(pressed("Jueves"));
    expect(pressed("Jueves")).toHaveAttribute("aria-pressed", "true");
    expect(pressed("Jueves")).toHaveTextContent("J");
    fireEvent.click(pressed("Jueves"));
    expect(pressed("Jueves")).toHaveAttribute("aria-pressed", "false");
  });

  it("previews the customer block live from the unsaved values", () => {
    renderForm();
    expect(within(preview()).getByText(EMPTY_PREVIEW)).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Cuotas"), { target: { value: "12" } });
    expect(within(preview()).getByText(EMPTY_PREVIEW)).toBeInTheDocument();
    fireEvent.click(pressed("Itaú"));
    fireEvent.click(pressed("Continental"));

    const view = within(preview());
    expect(view.queryByText(EMPTY_PREVIEW)).not.toBeInTheDocument();
    expect(view.getByText("Nuestras promociones bancarias")).toBeInTheDocument();
    expect(view.getByText("Hasta 12 cuotas sin intereses")).toBeInTheDocument();
    expect(view.getByRole("img", { name: "Itaú" })).toBeInTheDocument();
    expect(view.getByText("Continental")).toBeInTheDocument();
    expect(view.getByText("Ver bases y condiciones →")).toBeInTheDocument();
    expect(view.getByText("En todos los productos, todos los días.")).toBeInTheDocument();

    fireEvent.click(pressed("Reintegro"));
    fireEvent.change(screen.getByLabelText("Porcentaje"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Tope (₲)"), { target: { value: "200.000" } });
    fireEvent.click(pressed("Jueves"));
    fireEvent.click(pressed("Marcas"));
    fireEvent.click(within(lotsGroup()).getByLabelText(/Lote verano/));
    fireEvent.change(screen.getByLabelText("Desde"), { target: { value: "2026-11-01" } });
    fireEvent.change(screen.getByLabelText("Hasta"), { target: { value: "2026-11-30" } });
    expect(view.getByText("20 % de reintegro · Jueves · Tope ₲ 200.000")).toBeInTheDocument();
    expect(
      view.getByText("Solo en prendas de la marca Lote verano, los jueves del 01/11 al 30/11."),
    ).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Porcentaje"), { target: { value: "500" } });
    expect(view.getByText(EMPTY_PREVIEW)).toBeInTheDocument();
  });

  it("submits every field and the picked banks, days, lots and products", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.click(pressed("Reintegro"));
    fireEvent.change(screen.getByLabelText("Porcentaje"), { target: { value: "20" } });
    fireEvent.change(screen.getByLabelText("Tope (₲)"), { target: { value: "200.000" } });
    fireEvent.click(pressed("Continental"));
    fireEvent.click(pressed("Itaú"));
    fireEvent.click(pressed("Jueves"));
    fireEvent.click(pressed("Lunes"));
    fireEvent.click(pressed("Marcas"));
    fireEvent.click(within(lotsGroup()).getByLabelText(/Lote verano/));
    fireEvent.change(screen.getByLabelText("Bases y condiciones"), {
      target: { value: "Crédito." },
    });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as unknown as FormData;
    expect(data.get("kind")).toBe("refund");
    expect(data.get("value")).toBe("20");
    expect(data.get("capGs")).toBe("200.000");
    expect(data.get("scope")).toBe("lots");
    expect(data.get("isActive")).toBe("on");
    expect(data.get("terms")).toBe("Crédito.");
    expect(data.getAll("bankIds")).toEqual(["b1", "b2"]);
    expect(data.getAll("days")).toEqual(["1", "4"]);
    expect(data.getAll("lotIds")).toEqual(["l1"]);
    expect(data.getAll("productIds")).toEqual([]);
  });

  it("does not submit isActive once the switch is turned off", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.click(screen.getByRole("switch", { name: "Activa" }));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    await waitFor(() => expect(action).toHaveBeenCalled());
    const data = action.mock.calls[0]?.[1] as unknown as FormData;
    expect(data.get("isActive")).toBeNull();
  });

  it("submits the picked products for the 'Productos' scope", async () => {
    const action = vi.fn(idle);
    renderForm({ action });
    fireEvent.click(pressed("Productos"));
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
        lotIds: "Elegí al menos una marca.",
      },
      values: { kind: "installments", value: "99", scope: "lots" },
    });
    renderForm({ action });
    fireEvent.change(screen.getByLabelText("Cuotas"), { target: { value: "99" } });
    fireEvent.click(pressed("Marcas"));
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByText("Las cuotas deben estar entre 2 y 48.")).toBeInTheDocument();
    expect(screen.getByText("Elegí al menos un banco.")).toBeInTheDocument();
    expect(screen.getByText("Elegí al menos una marca.")).toBeInTheDocument();
    expect(screen.getByLabelText("Cuotas")).toHaveValue("99");
  });

  it("shows the success message after saving", async () => {
    const action = async (): Promise<FormState> => ({
      status: "success",
      message: "Promoción guardada.",
    });
    renderForm({ action, promoId: "p9", savedHeadline: "20 % de reintegro" });
    fireEvent.click(screen.getByRole("button", { name: "Guardar" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Promoción guardada.");
  });
});
