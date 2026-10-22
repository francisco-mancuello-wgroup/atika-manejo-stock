import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FormState } from "../lib/action-state";
import { PaymentDetailsForm } from "./payment-details-form";

const details = {
  holderName: "SZUT EAS",
  bank: "Basa",
  accountGs: "2155009507",
  accountUsd: "12155002091",
  ruc: "80132068-2",
};

const submit = () =>
  fireEvent.submit(
    screen
      .getByRole("button", { name: "Guardar datos bancarios" })
      .closest("form") as HTMLFormElement,
  );

describe("PaymentDetailsForm", () => {
  it("shows every field with its saved value", () => {
    render(<PaymentDetailsForm details={details} action={vi.fn()} />);
    expect(screen.getByLabelText("Razón social")).toHaveValue("SZUT EAS");
    expect(screen.getByLabelText("Banco")).toHaveValue("Basa");
    expect(screen.getByLabelText("Cuenta en guaraníes")).toHaveValue("2155009507");
    expect(screen.getByLabelText("Cuenta en dólares")).toHaveValue("12155002091");
    expect(screen.getByLabelText("RUC")).toHaveValue("80132068-2");
  });

  it("starts empty when nothing was saved yet", () => {
    render(<PaymentDetailsForm details={null} action={vi.fn()} />);
    expect(screen.getByLabelText("Razón social")).toHaveValue("");
  });

  it("shows the errors and keeps what was typed", async () => {
    const action = vi.fn(
      async (): Promise<FormState> => ({
        status: "error",
        message: "Revisá los campos marcados.",
        fieldErrors: { ruc: "Ingresá el RUC." },
        values: { ...details, ruc: "" },
      }),
    );
    render(<PaymentDetailsForm details={details} action={action} />);
    submit();
    expect(await screen.findByText("Ingresá el RUC.")).toBeInTheDocument();
    expect(screen.getByLabelText("RUC")).toHaveValue("");
  });
});
