import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { SettingsForms } from "./settings-forms";

const settings = { exchangeRate: 7400, saleFactor: 2.5, vatPercent: 10, costPercent: 100 };
const idle = async (): Promise<FormState> => ({ status: "idle" });

describe("SettingsForms", () => {
  it("shows the saved settings with percentages", () => {
    render(<SettingsForms settings={settings} saveAction={idle} applyAction={idle} />);
    expect(screen.getByLabelText("TC del día (₲ / US$)")).toHaveValue(7400);
    expect(screen.getByLabelText("Factor de venta por defecto")).toHaveValue(2.5);
    expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(100);
    expect(screen.getByRole("button", { name: "Guardar parámetros" })).toBeInTheDocument();
  });

  it("submits the form values to the save action", async () => {
    const save = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Parámetros guardados.",
      }),
    );
    render(<SettingsForms settings={settings} saveAction={save} applyAction={idle} />);
    fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar parámetros" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Parámetros guardados.");
    const data = save.mock.calls[0]?.[1] as FormData;
    expect(data.get("vatPercent")).toBe("5");
  });

  it("applies the defaults to all lots through its own action", async () => {
    const apply = vi.fn(
      async (_p: FormState, _d: FormData): Promise<FormState> => ({
        status: "success",
        message: "Se actualizaron 4 lotes y se recalcularon 123 precios.",
      }),
    );
    render(<SettingsForms settings={settings} saveAction={idle} applyAction={apply} />);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Aplicar a todos los lotes" })
        .closest("form") as HTMLFormElement,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("4 lotes");
    expect(apply).toHaveBeenCalledTimes(1);
  });

  it("shows field errors", async () => {
    const save = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { vatPercent: "El IVA no puede superar 100." },
      values: { vatPercent: "250" },
    });
    render(<SettingsForms settings={settings} saveAction={save} applyAction={idle} />);
    fireEvent.submit(
      screen.getByRole("button", { name: "Guardar parámetros" }).closest("form") as HTMLFormElement,
    );
    expect(await screen.findByText("El IVA no puede superar 100.")).toBeInTheDocument();
    expect(screen.getByLabelText("IVA (%)")).toHaveAttribute("aria-invalid", "true");
  });
});
