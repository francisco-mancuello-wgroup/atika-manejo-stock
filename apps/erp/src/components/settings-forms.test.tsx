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

function renderForm(action: Action = idle) {
  render(<SettingsForm settings={settings} lots={lots} action={action} />);
}

describe("SettingsForm", () => {
  it("shows the saved settings with percentages and only saves by default", () => {
    renderForm();
    expect(screen.getByLabelText("TC del día (₲ / US$)")).toHaveValue(7400);
    expect(screen.getByLabelText("Factor de venta por defecto")).toHaveValue(2.5);
    expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(100);
    expect(screen.getByRole("radio", { name: "Solo lotes nuevos" })).toBeChecked();
    expect(screen.getByText("Solo se guardan los valores por defecto.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar" })).toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
  });

  it("lists the lots with their product count only for selected lots", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Lotes seleccionados" }));
    expect(screen.getByRole("checkbox", { name: /Lote A/ })).not.toBeChecked();
    expect(screen.getByText("12 productos")).toBeInTheDocument();
    expect(screen.getByText("Se recalculan 0 lotes · 0 productos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar y aplicar" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: /Lote A/ }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Lote B/ }));
    expect(screen.getByText("Se recalculan 2 lotes · 17 productos")).toBeInTheDocument();
  });

  it("summarizes every lot for the all scope", () => {
    renderForm();
    fireEvent.click(screen.getByRole("radio", { name: "Todos los lotes" }));
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.getByText("Se recalculan 2 lotes · 17 productos")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Guardar y aplicar" })).toBeInTheDocument();
  });

  it("submits the values, the scope and each chosen lot id", async () => {
    const action = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Parámetros guardados. Se actualizaron 1 lotes y se recalcularon 12 precios.",
      }),
    );
    renderForm(action);
    fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("radio", { name: "Lotes seleccionados" }));
    fireEvent.click(screen.getByRole("checkbox", { name: /Lote B/ }));
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar y aplicar" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("1 lotes");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("vatPercent")).toBe("5");
    expect(data.get("scope")).toBe("selected");
    expect(data.getAll("lotIds")).toEqual(["lot-b"]);
  });

  it("shows field errors, including the lot selection", async () => {
    const action: Action = async () => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: {
        vatPercent: "El IVA no puede superar 100.",
        lotIds: "Elegí al menos un lote.",
      },
      values: { vatPercent: "250" },
    });
    renderForm(action);
    fireEvent.click(screen.getByRole("radio", { name: "Lotes seleccionados" }));
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar y aplicar" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByText("El IVA no puede superar 100.")).toBeInTheDocument();
    expect(screen.getByLabelText("IVA (%)")).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText("Elegí al menos un lote.")).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Lotes" })).toHaveAttribute("aria-invalid", "true");
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
