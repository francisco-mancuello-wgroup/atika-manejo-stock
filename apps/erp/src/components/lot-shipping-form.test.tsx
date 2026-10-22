import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { LotShippingForm } from "./lot-shipping-form";

const idle = async (): Promise<FormState> => ({ status: "idle" });
const submit = () =>
  fireEvent.submit(
    screen.getByRole("button", { name: "Guardar envío" }).closest("form") as HTMLFormElement,
  );

describe("LotShippingForm", () => {
  it("shows only the current shipping", () => {
    render(<LotShippingForm totalShippingUsd={320.5} action={idle} />);
    expect(screen.getByLabelText("Envío total (US$)")).toHaveValue(320.5);
    expect(screen.getAllByRole("spinbutton")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: "Guardar y recalcular" })).not.toBeInTheDocument();
  });

  it("submits the shipping to the action and shows the success message", async () => {
    const action = vi.fn(
      async (_prev: FormState, _data: FormData): Promise<FormState> => ({
        status: "success",
        message: "Envío guardado. Se recalcularon 3 precios.",
      }),
    );
    render(<LotShippingForm totalShippingUsd={320.5} action={action} />);
    fireEvent.change(screen.getByLabelText("Envío total (US$)"), { target: { value: "99" } });
    submit();

    expect(await screen.findByRole("status")).toHaveTextContent("Envío guardado.");
    const data = action.mock.calls[0]?.[1] as FormData;
    expect(data.get("totalShippingUsd")).toBe("99");
  });

  it("shows the error and the field error", async () => {
    const action = async (): Promise<FormState> => ({
      status: "error",
      message: "Revisá los campos marcados.",
      fieldErrors: { totalShippingUsd: "El envío no puede ser negativo." },
      values: { totalShippingUsd: "-3" },
    });
    render(<LotShippingForm totalShippingUsd={320.5} action={action} />);
    submit();

    expect(await screen.findByRole("alert")).toHaveTextContent("Revisá los campos marcados.");
    await waitFor(() =>
      expect(screen.getByText("El envío no puede ser negativo.")).toBeInTheDocument(),
    );
    expect(screen.getByLabelText("Envío total (US$)")).toHaveAttribute("aria-invalid", "true");
  });
});
