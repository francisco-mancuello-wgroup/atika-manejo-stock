import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { SettingsForm } from "./settings-forms";

const settings = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 100 };
const lots = [
  { id: "lot-a", name: "Lote A", productCount: 12 },
  { id: "lot-b", name: "Lote B", productCount: 5 },
];
type Action = (previous: FormState, formData: FormData) => Promise<FormState>;
const idle: Action = async () => ({ status: "idle" });

function renderForm(action: Action = idle, formLots = lots) {
  render(<SettingsForm settings={settings} lots={formLots} action={action} />);
}

describe("SettingsForm", () => {
  it("explains that applying updates every lot but keeps its shipping", () => {
    renderForm();
    expect(
      screen.getByText(
        "Al guardar, todos los lotes toman de acá el TC, el factor, el IVA y el % de costo, y conservan su propio envío.",
      ),
    ).toBeInTheDocument();
  });

  it("shows the saved settings and always applies them to every lot", () => {
    renderForm();
    expect(screen.getByLabelText("TC del día (₲ / US$)")).toHaveValue(7400);
    expect(screen.getByLabelText("Factor de venta por defecto")).toHaveValue(2.5);
    expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(100);
    expect(screen.queryByRole("radio")).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Se recalculan 2 lotes · 17 productos")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Guardar y aplicar a todos los lotes" }),
    ).toBeInTheDocument();
  });

  it("uses the singular in the summary for one lot with one product", () => {
    renderForm(idle, [{ id: "lot-a", name: "Lote A", productCount: 1 }]);
    expect(screen.getByText("Se recalcula 1 lote · 1 producto")).toBeInTheDocument();
  });

  it("submits only the values", async () => {
    const action = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Parámetros guardados. Se actualizaron 2 lotes y se recalcularon 17 precios.",
      }),
    );
    renderForm(action);
    fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y aplicar a todos los lotes" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Se actualizaron 2 lotes");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("vatPercent")).toBe("5");
    expect(data.has("scope")).toBe(false);
    expect(data.has("lotIds")).toBe(false);
  });

  it("shows field errors", async () => {
    const action: Action = async () => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { vatPercent: "El IVA no puede superar 100." },
      values: { vatPercent: "250" },
    });
    renderForm(action);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y aplicar a todos los lotes" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByText("El IVA no puede superar 100.")).toBeInTheDocument();
    expect(screen.getByLabelText("IVA (%)")).toHaveAttribute("aria-invalid", "true");
  });

  it("explains how prices are calculated as numbered steps", () => {
    renderForm();
    const steps = within(
      screen.getByRole("list", { name: "Cómo se calcula el precio" }),
    ).getAllByRole("listitem");
    expect(steps).toHaveLength(3);
    expect(steps[0]).toHaveTextContent("Envío por unidad");
    expect(steps[0]).toHaveTextContent("Envío total del lote ÷ unidades compradas");
    expect(steps[1]).toHaveTextContent("Costo unitario");
    expect(steps[2]).toHaveTextContent("Precio de venta");
    expect(steps[2]).toHaveTextContent("Redondeado a 1.000 ₲");
  });
});
