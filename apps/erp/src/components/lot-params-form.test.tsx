import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { LotParamsForm } from "./lot-params-form";

const params = {
  exchangeRate: 7400,
  saleFactor: 2.5,
  vatPercent: 10,
  costPercent: 55,
  totalShippingUsd: 320.5,
};

describe("LotParamsForm", () => {
  it("shows the current parameters in the inputs", () => {
    render(<LotParamsForm params={params} action={async () => ({ status: "idle" })} />);
    expect(screen.getByLabelText("Tipo de cambio (₲ / US$)")).toHaveValue(7400);
    expect(screen.getByLabelText("Factor de venta")).toHaveValue(2.5);
    expect(screen.getByLabelText("IVA (%)")).toHaveValue(10);
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveValue(55);
    expect(screen.getByLabelText("Envío total (US$)")).toHaveValue(320.5);
    expect(screen.getByRole("button", { name: "Guardar y recalcular" })).toBeInTheDocument();
  });

  it("submits the form values to the action and shows the success message", async () => {
    const action = vi.fn(
      async (_prev: FormState, _data: FormData): Promise<FormState> => ({
        status: "success",
        message: "Parámetros guardados. Se recalcularon 12 precios.",
      }),
    );
    render(<LotParamsForm params={params} action={action} />);
    fireEvent.change(screen.getByLabelText("IVA (%)"), { target: { value: "5" } });
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y recalcular" })
        .closest("form") as HTMLFormElement,
    );

    expect(await screen.findByRole("status")).toHaveTextContent("Se recalcularon 12 precios.");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("vatPercent")).toBe("5");
    expect(data.get("exchangeRate")).toBe("7400");
  });

  it("shows the error and the field errors", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { costPercent: "El costo no puede superar 100." },
      values: { costPercent: "150" },
    });
    render(<LotParamsForm params={params} action={action} />);
    fireEvent.submit(
      screen
        .getByRole("button", { name: "Guardar y recalcular" })
        .closest("form") as HTMLFormElement,
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá los campos marcados.");
    await waitFor(() =>
      expect(screen.getByText("El costo no puede superar 100.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Costo sobre valor original (%)")).toHaveAttribute(
      "aria-invalid",
      "true",
    );
  });
});
